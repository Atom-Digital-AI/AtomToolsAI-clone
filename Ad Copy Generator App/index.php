<?php
session_start();
require 'vendor/autoload.php'; // For OpenAI, CSV handling etc.

use OpenAI\Client;
use GuzzleHttp\Client as HttpClient;

// Initialize Flask-like configuration
$config = [
    'secret_key' => 'your_secret_key',
    'openai_api_key' => getenv('OPENAI_API_KEY')
];

// Initialize OpenAI client
$openai = OpenAI::client($config['openai_api_key']);

function fetch_url_content($url) {
    try {
        $client = new HttpClient();
        $response = $client->get($url);
        return $response->getBody()->getContents();
    } catch (Exception $e) {
        error_log("Error fetching URL: " . $e->getMessage());
        return null;
    }
}

function extract_text_from_html($html) {
    $dom = new DOMDocument();
    @$dom->loadHTML($html);
    $xpath = new DOMXPath($dom);
    $paragraphs = $xpath->query("//p");
    
    $texts = [];
    foreach ($paragraphs as $p) {
        $texts[] = $p->textContent;
    }
    
    return trim(implode(' ', $texts));
}

function generate_ad_copy($url_content, $target_keywords, $brand_name, $selling_points) {
    global $openai;
    
    $user_prompt = "Based on the following webpage content:\n" .
        $url_content . "\n\n" .
        "And using these inputs:\n" .
        "Target Keywords: " . $target_keywords . "\n" .
        "Brand Name: " . $brand_name . "\n" .
        "Selling Points: " . ($selling_points ?: "None") . "\n\n" .
        "Generate Google Ads copy that includes:\n" .
        "- 3 headlines, each a maximum of 30 characters:\n" .
        "  - Headline 1: Use one of the target keywords (if too long, use another).\n" .
        "  - Headline 2: Use one of the selling points or a call to action.\n" .
        "  - Headline 3: Use the brand name or a call to action.\n" .
        "  (Ensure only one headline uses a target keyword, one uses a selling point/CTA, and one uses the brand name/CTA.)\n\n" .
        "- 2 descriptions, each a maximum of 90 characters:\n" .
        "  - Description 1: Describe the offering using the target keyword and emphasize a selling point.\n" .
        "  - Description 2: Add additional selling points and finish with a call to action.\n\n" .
        "Output the result in JSON format like:\n" .
        "{\n" .
        "    \"headlines\": [\"Headline 1\", \"Headline 2\", \"Headline 3\"],\n" .
        "    \"descriptions\": [\"Description 1\", \"Description 2\"]\n" .
        "}";

    try {
        $response = $openai->chat()->create([
            'model' => 'gpt-3.5-turbo',
            'messages' => [
                ['role' => 'system', 'content' => 'You are a professional ad copy generator.'],
                ['role' => 'user', 'content' => $user_prompt]
            ],
            'max_tokens' => 300,
            'temperature' => 0.7,
            'top_p' => 1.0,
            'n' => 1
        ]);
        
        return trim($response->choices[0]->message->content);
    } catch (Exception $e) {
        error_log("Error generating ad copy: " . $e->getMessage());
        return null;
    }
}

function clean_keyword($keyword) {
    if (empty($keyword)) {
        return '';
    }
    
    $keyword = (string)$keyword;
    $cleaned = preg_replace('/[\[\]""+]/', '', $keyword);
    return trim($cleaned);
}

function get_csv_headers($file_content) {
    $handle = fopen('php://memory', 'r+');
    fwrite($handle, $file_content);
    rewind($handle);
    
    $headers = fgetcsv($handle);
    fclose($handle);
    
    return $headers;
}

function process_csv_data($file_content, $column_mapping) {
    $handle = fopen('php://memory', 'r+');
    fwrite($handle, $file_content);
    rewind($handle);
    
    $headers = fgetcsv($handle);
    $data = [];
    $grouped_data = [];
    
    while (($row = fgetcsv($handle)) !== false) {
        $mapped_row = array_combine($headers, $row);
        $campaign_name = $mapped_row[$column_mapping['campaign_col']];
        $adgroup_name = $mapped_row[$column_mapping['adgroup_col']];
        $keyword = clean_keyword($mapped_row[$column_mapping['keyword_col']]);
        
        if (!empty($keyword)) {
            $key = $campaign_name . '_' . $adgroup_name;
            if (!isset($grouped_data[$key])) {
                $grouped_data[$key] = [
                    'Campaign Name' => $campaign_name,
                    'Ad Group Name' => $adgroup_name,
                    'Target Keyword' => []
                ];
            }
            $grouped_data[$key]['Target Keyword'][] = $keyword;
        }
    }
    
    fclose($handle);
    
    if (empty($grouped_data)) {
        throw new Exception("No valid keywords found in the CSV file");
    }
    
    return array_values($grouped_data);
}

function apply_case_type($text, $case_type) {
    if ($case_type === 'title') {
        return ucwords(strtolower($text));
    } elseif ($case_type === 'sentence') {
        return ucfirst(strtolower($text));
    }
    return $text;
}

function format_ad_copy($ad_copy_json, $case_type, $brand_name) {
    $ad_data = json_decode($ad_copy_json, true);
    
    $ad_data['headlines'] = array_map(function($h) use ($case_type, $brand_name) {
        return strpos($h, $brand_name) !== false ? $h : apply_case_type($h, $case_type);
    }, $ad_data['headlines']);
    
    $ad_data['descriptions'] = array_map(function($d) use ($case_type, $brand_name) {
        $words = explode(' ', $d);
        $words = array_map(function($word) use ($case_type, $brand_name) {
            return $word === $brand_name ? $word : apply_case_type($word, $case_type);
        }, $words);
        return implode(' ', $words);
    }, $ad_data['descriptions']);
    
    return $ad_data;
}

function create_ads_editor_csv($campaign_data, $ad_copies) {
    $headers = [
        'Campaign', 'Ad Group', 'Headline 1', 'Headline 2', 'Headline 3',
        'Description Line 1', 'Description Line 2'
    ];
    
    $output = [];
    foreach ($campaign_data as $row) {
        $key = $row['Campaign Name'] . '_' . $row['Ad Group Name'];
        if (isset($ad_copies[$key])) {
            $output[] = [
                $row['Campaign Name'],
                $row['Ad Group Name'],
                $ad_copies[$key]['headlines'][0],
                $ad_copies[$key]['headlines'][1],
                $ad_copies[$key]['headlines'][2],
                $ad_copies[$key]['descriptions'][0],
                $ad_copies[$key]['descriptions'][1]
            ];
        }
    }
    
    return [$headers, $output];
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['csv_file'])) {
        $csv_file = $_FILES['csv_file'];
        if ($csv_file['error'] === UPLOAD_ERR_OK) {
            $csv_content = file_get_contents($csv_file['tmp_name']);
            $_SESSION['csv_content'] = $csv_content;
            
            $headers = get_csv_headers($csv_content);
            $suggested_mappings = get_suggested_mappings($headers);
            
            include 'templates/column_mapping.php';
            exit;
        }
    } elseif (isset($_POST['column_mapping'])) {
        // Handle column mapping submission
        try {
            $column_mapping = [
                'campaign_col' => $_POST['campaign_col'],
                'adgroup_col' => $_POST['adgroup_col'],
                'keyword_col' => $_POST['keyword_col']
            ];
            
            $csv_content = $_SESSION['csv_content'];
            $campaign_data = process_csv_data($csv_content, $column_mapping);
            $ad_copies = [];
            
            foreach ($campaign_data as $row) {
                $keywords = implode(', ', $row['Target Keyword']);
                $ad_copy = generate_ad_copy(
                    $_POST['target_url'],
                    $keywords,
                    $_POST['brand_name'],
                    $_POST['selling_points'] ?? ''
                );
                
                if ($ad_copy) {
                    $formatted_copy = format_ad_copy(
                        $ad_copy,
                        $_POST['case_type'],
                        $_POST['brand_name']
                    );
                    $ad_copies[$row['Campaign Name'] . '_' . $row['Ad Group Name']] = $formatted_copy;
                }
            }
            
            list($headers, $output_data) = create_ads_editor_csv($campaign_data, $ad_copies);
            
            // Output CSV file
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="ads_output.csv"');
            
            $output = fopen('php://output', 'w');
            fputcsv($output, $headers);
            foreach ($output_data as $row) {
                fputcsv($output, $row);
            }
            fclose($output);
            exit;
            
        } catch (Exception $e) {
            $_SESSION['flash_message'] = $e->getMessage();
            header('Location: index.php');
            exit;
        }
    } else {
        // Handle single ad generation
        // ... similar to Python version ...
    }
}

// Display main form
include 'templates/index.php'; 