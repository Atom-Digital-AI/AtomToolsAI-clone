import { db } from "./db";
import { adSpecs } from "@shared/schema";

const AD_SPECS_DATA = [
  {
    "platform": "Facebook",
    "format": "Feed Image Ad",
    "fields": {
      "Primary Text": {
        "limit": "125 characters (recommended visible)",
        "max_length": "larger possible but 125 before truncation"
      },
      "Headline": {
        "limit": "27 characters (mobile); ~40 max for desktop"
      },
      "Description": {
        "limit": "25 characters (link description, desktop only)"
      },
      "CTA Button": {
        "options": ["Learn More", "Shop Now", "Sign Up", "... (?30 options)"],
        "optional": true
      }
    },
    "media": {
      "type": "Image (JPG/PNG)",
      "recommended_aspect_ratio": "1.91:1 (landscape) or 1:1 (square)",
      "alternative_aspect_ratio": "4:5 (vertical, mobile-only)",
      "min_dimensions": "600?600 (1:1); 600?750 (4:5)",
      "recommended_dimensions": "1080?1080 (square); 1440?1440 or 1440?1800 for best quality",
      "max_file_size": "30 MB"
    }
  },
  {
    "platform": "Facebook",
    "format": "Feed Video Ad",
    "fields": {
      "Primary Text": {
        "limit": "80 characters (recommended)",
        "max_length": "~125 chars before truncation"
      },
      "Headline": {
        "limit": "25 characters (recommended)"
      },
      "Description": {
        "limit": "25 characters (optional)"
      },
      "CTA Button": {
        "options": ["Learn More", "Watch More", "Shop Now", "..."],
        "optional": true
      }
    },
    "media": {
      "type": "Video (MP4/MOV/GIF)",
      "recommended_aspect_ratio": "4:5 (vertical) for feed",
      "alternative_aspect_ratio": "1:1 (supported; 16:9 also but letterboxed)",
      "resolution": "?1080?1080 (HD)",
      "max_file_size": "4 GB",
      "video_length": "1 sec to 241 min max",
      "notes": "Sound optional (autoplay muted)"
    }
  },
  {
    "platform": "Facebook",
    "format": "Carousel Ad",
    "fields": {
      "Primary Text": {
        "limit": "80 characters recommended (shared across cards)"
      },
      "Headline (per card)": {
        "limit": "45 characters"
      },
      "Description (per card)": {
        "limit": "18 characters"
      },
      "CTA Button": {
        "options": ["Learn More", "See Details", "Shop Now", "..."],
        "optional": true,
        "note": "One CTA for entire carousel (can have unique links per card)"
      }
    },
    "media": {
      "type": "Image/Video per card",
      "aspect_ratio": "Uniform across all cards: 1:1 or 4:5",
      "cards": "2 to 10 cards",
      "image_specs": "JPG/PNG, ?1080?1080 px, 30MB max each",
      "video_specs": "MP4/MOV, ?1080?1080, 4GB max each, same AR across cards"
    }
  },
  {
    "platform": "Facebook",
    "format": "Stories Ad (Image)",
    "fields": {
      "Primary Text": {
        "limit": "125 characters (may be hidden/overlay)"
      },
      "CTA Button": {
        "options": ["Swipe Up: See More, etc."],
        "optional": true
      }
    },
    "media": {
      "type": "Vertical Image (JPG/PNG)",
      "aspect_ratio": "9:16",
      "recommended_size": "1080?1920 px",
      "min_width": "500 px",
      "max_file_size": "30 MB",
      "safe_zone": "Avoid top 250px and bottom 340px for UI"
    }
  },
  {
    "platform": "Facebook",
    "format": "Stories Ad (Video)",
    "fields": {
      "Primary Text": {
        "limit": "125 characters (brief overlay caption)"
      },
      "CTA Button": {
        "options": ["Swipe Up CTAs"],
        "optional": true
      }
    },
    "media": {
      "type": "Vertical Video (MP4/MOV)",
      "aspect_ratio": "9:16 full-screen",
      "recommended_size": "1080?1920 px",
      "video_length": "1 to 15 sec per story card",
      "max_file_size": "4 GB",
      "safe_zone": "Keep top/bottom text-free (14% top, 20% bottom)"
    }
  },
  {
    "platform": "Facebook",
    "format": "Reels Ad (Video)",
    "fields": {
      "Primary Text": {
        "limit": "60 characters (caption before truncation)"
      },
      "CTA Button": {
        "optional": true,
        "note": "Small overlay or swipe CTA"
      }
    },
    "media": {
      "type": "Vertical Video",
      "aspect_ratio": "9:16",
      "resolution": "1440?2560 px recommended",
      "video_length": "No stated max (short form recommended)",
      "max_file_size": "4 GB",
      "notes": "Appears in Reels feed; auto-play with sound"
    }
  },
  {
    "platform": "Facebook",
    "format": "Reels Overlay Ad",
    "fields": {
      "Primary Text": {
        "limit": "60 characters"
      },
      "Headline": {
        "limit": "10 characters"
      }
    },
    "media": {
      "type": "Image Banner Overlay",
      "aspect_ratio": "1:1 or 1.91:1 (small overlay)",
      "max_file_size": "30 MB",
      "notes": "Appears as banner on creator's Reel"
    }
  },
  {
    "platform": "Facebook",
    "format": "Right Column Ad (Desktop)",
    "fields": {
      "Headline": {
        "limit": "40 characters"
      },
      "Primary Text": {
        "note": "N/A (no body text on right-column format)"
      }
    },
    "media": {
      "type": "Image",
      "aspect_ratio": "1:1 (recommended) or 1.91:1",
      "recommended_size": "1080?1080 px or 1200?628 px",
      "notes": "Small thumbnail on desktop; avoid text on image"
    }
  },
  {
    "platform": "Facebook",
    "format": "Marketplace Ad",
    "fields": {
      "Primary Text": {
        "limit": "125 characters"
      },
      "Headline": {
        "limit": "40 characters"
      },
      "Description": {
        "limit": "30 characters"
      }
    },
    "media": {
      "type": "Image/Video",
      "aspect_ratio": "1:1 preferred",
      "notes": "Same specs as feed image/video"
    }
  },
  {
    "platform": "Facebook",
    "format": "Messenger Inbox Ad",
    "fields": {
      "Primary Text": {
        "limit": "125 characters"
      },
      "Headline": {
        "limit": "45 characters (if image ad card)"
      }
    },
    "media": {
      "type": "Image (1.91:1 or 1:1)",
      "recommended_size": "1080?1080 px"
    }
  },
  {
    "platform": "Facebook",
    "format": "Messenger Stories Ad",
    "fields": {
      "Primary Text": {
        "limit": "125 characters"
      },
      "CTA": {
        "limit": "40 characters (headline style)"
      }
    },
    "media": {
      "type": "Vertical Image/Video",
      "specs": "Same as Facebook Stories"
    }
  },
  {
    "platform": "Facebook",
    "format": "Collection Ad (Instant Experience)",
    "fields": {
      "Primary Text": {
        "limit": "125 characters"
      },
      "Headline": {
        "limit": "40 characters"
      },
      "CTA Button": {
        "options": ["Shop Now", "Learn More", "..."],
        "required": true
      }
    },
    "media": {
      "type": "Cover Image or Video + product images",
      "cover_recommended": "1200?628 or 1080?1080 image; or short video <120s",
      "product_images": "4 product thumbnails (1080?1080 each)"
    }
  },
  // Instagram formats
  {
    "platform": "Instagram",
    "format": "Feed Photo Ad / Post",
    "fields": {
      "Caption": {
        "limit": "125?150 characters recommended",
        "max_length": "2,200 characters (full caption)"
      },
      "Hashtags": {
        "limit": "30 hashtags per post"
      },
      "CTA Button": {
        "options": ["Learn More", "Shop Now", "Install", "..."],
        "optional": true
      }
    },
    "media": {
      "type": "Image",
      "aspect_ratio_range": "1.91:1 to 4:5 supported",
      "recommended_ratio": "1:1 square",
      "minimum_resolution": "1080?1080 px",
      "max_file_size": "30 MB"
    }
  },
  {
    "platform": "Instagram",
    "format": "Feed Video Ad / Post",
    "fields": {
      "Caption": {
        "limit": "125 characters recommended",
        "max_length": "2,200 characters allowed"
      },
      "CTA Button": {
        "options": ["Watch More", "Learn More", "Shop Now", "..."],
        "optional": true
      }
    },
    "media": {
      "type": "Video",
      "aspect_ratio_range": "1.91:1 to 9:16 (4:5 recommended)",
      "resolution": "?1080 px width (HD)",
      "max_file_size": "4 GB",
      "video_length": "1s to 60m (60s recommended max for feed)",
      "format": "MP4/MOV (H.264 + AAC)"
    }
  },
  {
    "platform": "Instagram",
    "format": "Carousel Ad (Feed)",
    "fields": {
      "Caption": {
        "limit": "125 characters recommended (shared)",
        "max_length": "2,200 characters allowed"
      },
      "Hashtags": {
        "limit": "30 per post"
      },
      "CTA Button": {
        "options": ["Swipe to See More", "Shop Now", "..."],
        "optional": true
      }
    },
    "media": {
      "type": "Up to 10 Images/Videos",
      "aspect_ratio": "All cards 1:1 or all 4:5 (consistent)",
      "image_specs": "1080?1080 or 1080?1350 px, 30MB max each",
      "video_specs": "MP4/MOV ? 60s each (if multiple), 4GB max each"
    }
  },
  {
    "platform": "Instagram",
    "format": "Stories Ad (Image)",
    "fields": {
      "Caption": {
        "limit": "Minimal (few words via stickers or none)"
      },
      "CTA": {
        "options": ["Swipe Up (See More)"],
        "optional": true
      }
    },
    "media": {
      "type": "Vertical Image",
      "aspect_ratio": "9:16 full-screen",
      "resolution": "1080?1920 px recommended",
      "max_file_size": "30 MB",
      "note": "Leave top 14% and bottom 20% text-free"
    }
  },
  {
    "platform": "Instagram",
    "format": "Stories Ad (Video)",
    "fields": {
      "Caption": {
        "limit": "~125 chars (few words visible)"
      },
      "CTA": {
        "options": ["Swipe Up CTAs"],
        "optional": true
      }
    },
    "media": {
      "type": "Vertical Video",
      "aspect_ratio": "9:16",
      "resolution": "1080?1920 px",
      "video_length": "1?15 sec (?60s via multiple cards)",
      "max_file_size": "4 GB",
      "note": "Use captions or text on video (sound off by default)"
    }
  },
  {
    "platform": "Instagram",
    "format": "Reels Ad (Image)",
    "fields": {
      "Caption": {
        "limit": "72 characters (very short)"
      }
    },
    "media": {
      "type": "Full-screen Image",
      "aspect_ratio": "9:16",
      "resolution": "1080?1920 px",
      "max_file_size": "30 MB"
    }
  },
  {
    "platform": "Instagram",
    "format": "Reels Ad (Video)",
    "fields": {
      "Caption": {
        "limit": "72 characters before '... more'"
      },
      "CTA": {
        "optional": true,
        "note": "Appears as small button if used"
      }
    },
    "media": {
      "type": "Vertical Video",
      "aspect_ratio": "9:16",
      "resolution": "1080?1920 px (HD)",
      "video_length": "Up to 60s (Reels support ~90s)",
      "max_file_size": "4 GB",
      "note": "Behaves like organic Reels, user can skip by swipe"
    }
  },
  {
    "platform": "Instagram",
    "format": "Explore Ad",
    "fields": {
      "Caption": {
        "limit": "125 chars recommended"
      }
    },
    "media": {
      "type": "Image/Video",
      "notes": "Same specs as feed (ad appears in Explore feed)"
    }
  },
  {
    "platform": "Instagram",
    "format": "Shop Ad (Collection/Products)",
    "fields": {
      "Caption": {
        "limit": "125 chars (brief)"
      },
      "CTA": {
        "options": ["View Products", "Shop Now"],
        "optional": true
      }
    },
    "media": {
      "type": "Image or Collection",
      "notes": "Typically uses product catalog; specs similar to collection ad"
    }
  },
  // TikTok formats
  {
    "platform": "TikTok",
    "format": "In-Feed Video Ad",
    "fields": {
      "Caption Text": {
        "limit": "12?100 characters"
      },
      "Display Name": {
        "limit": "2?20 characters (no emojis)"
      },
      "Profile Image": {
        "specs": "1:1 JPG/PNG, <50 KB"
      },
      "CTA Button": {
        "options": ["Learn More", "Download", "Shop Now", "..."],
        "optional": true
      }
    },
    "media": {
      "type": "Vertical Video",
      "aspect_ratio": "9:16 (recommended)",
      "resolution": "?720?1280 px recommended",
      "min_resolution": "540?960 px",
      "max_file_size": "500 MB",
      "video_length": "5?60 sec (15s optimal)",
      "file_formats": [".mp4", ".mov", ".mpeg", ".3gp", ".avi"]
    }
  },
  {
    "platform": "TikTok",
    "format": "TopView Ad",
    "fields": {
      "Caption": {
        "limit": "Same as in-feed (optional brief text)"
      },
      "CTA": {
        "optional": true
      }
    },
    "media": {
      "type": "Vertical Video (auto-play)",
      "aspect_ratio": "9:16",
      "resolution": "720?1280+ px",
      "max_file_size": "500 MB",
      "video_length": "up to 60 sec (9?15s recommended)"
    }
  },
  {
    "platform": "TikTok",
    "format": "Brand Takeover",
    "fields": {
      "Caption": {
        "note": "No caption or user interaction"
      }
    },
    "media": {
      "type": "Short Video or Static Image",
      "video_specs": {
        "aspect_ratio": "9:16 (full), 1:1, or 16:9",
        "resolution": "Vertical: 1080?1920; Square:1080?1080; Landscape:1920?1080",
        "video_length": "3?5 seconds",
        "max_file_size": "500 MB"
      },
      "image_specs": {
        "aspect_ratio": "9:16, 1:1, or 16:9",
        "resolution": "Same as video",
        "max_file_size": "50 KB"
      }
    }
  },
  {
    "platform": "TikTok",
    "format": "Branded Hashtag Challenge",
    "fields": {
      "Hashtag": {
        "text": "#YourChallenge (few words)"
      },
      "Description": {
        "content": "Challenge instructions (brief, ~100 chars)"
      }
    },
    "media": {
      "type": "Multiple Videos (UGC + promo)",
      "video_specs": "9:16, up to 60s each",
      "note": "Includes banner on Discover and challenge page"
    }
  },
  {
    "platform": "TikTok",
    "format": "Branded Effect",
    "fields": {
      "Effect Name": {
        "limit": "?30 characters (18 rec)"
      },
      "Icon Logo": {
        "size": "150?130 px area max"
      },
      "Promo Text on Icon": {
        "size": "300?130 px area max"
      }
    },
    "media": {
      "type": "AR Effect Assets",
      "file_types": [".jpg", ".png (icon)"],
      "max_file_size": "1 MB (icon file)"
    }
  },
  {
    "platform": "TikTok",
    "format": "Spark Ad (Organic Post Ad)",
    "fields": {
      "Caption": {
        "limit": "Caption from original video (up to ~150 chars shown)"
      },
      "CTA": {
        "optional": true,
        "note": "Can add CTA to an existing post"
      }
    },
    "media": {
      "type": "Existing TikTok Video",
      "specs": "Same as in-feed video (9:16, ?60s, etc.)"
    }
  },
  {
    "platform": "TikTok",
    "format": "Image Ad (TikTok News Feed)",
    "fields": {
      "Headline": {
        "limit": "~ Caption-like text"
      }
    },
    "media": {
      "type": "Image",
      "aspect_ratio": "1:1",
      "max_file_size": "50 KB",
      "file_types": [".png", ".jpg"]
    }
  },
  // X (Twitter) formats
  {
    "platform": "X (Twitter)",
    "format": "Promoted Text-Only Tweet",
    "fields": {
      "Tweet Text": {
        "limit": "280 characters"
      }
    },
    "media": null
  },
  {
    "platform": "X (Twitter)",
    "format": "Promoted Image Tweet",
    "fields": {
      "Tweet Text": {
        "limit": "280 characters (links count as 23 chars)"
      },
      "Alt Text (Image)": {
        "limit": "1000 characters (accessibility)"
      }
    },
    "media": {
      "type": "Image",
      "recommended_size": "1200?628 px (1.91:1) or 800?800 px (1:1)",
      "file_types": [".jpg", ".png"],
      "max_file_size": "~5 MB"
    }
  },
  {
    "platform": "X (Twitter)",
    "format": "Website Card (Image)",
    "fields": {
      "Tweet Text": {
        "limit": "280 characters"
      },
      "Card Headline": {
        "limit": "70 characters (50 safe without truncation)"
      },
      "URL": {
        "format": "Must start with http:// or https://"
      }
    },
    "media": {
      "type": "Image (Card Thumbnail)",
      "recommended_size": "800?418 px (1.91:1) or 800?800 (1:1)",
      "aspect_ratio": "1.91:1 or 1:1"
    }
  },
  {
    "platform": "X (Twitter)",
    "format": "Website Card (Video)",
    "fields": {
      "Tweet Text": {
        "limit": "280 characters"
      },
      "Card Headline": {
        "limit": "70 characters"
      },
      "URL": "Landing page"
    },
    "media": {
      "type": "Video (in Card)",
      "recommended_size": "800?450 (16:9) or 800?800 (1:1) thumbnail",
      "video_specs": "MP4/MOV, ?2:20 length, ?1GB"
    }
  },
  {
    "platform": "X (Twitter)",
    "format": "App Card (Image)",
    "fields": {
      "Tweet Text": "280 characters",
      "App Name (Title)": "App Store name (auto, truncated at 200 chars)",
      "CTA": {
        "options": ["Install", "Open", "Play", "Shop", "Book", "Connect", "Order"]
      }
    },
    "media": {
      "type": "Image",
      "recommended_size": "800?418 or 800?800 (like website card)",
      "aspect_ratio": "1.91:1 or 1:1"
    }
  },
  {
    "platform": "X (Twitter)",
    "format": "App Card (Video)",
    "fields": {
      "Tweet Text": "280 characters",
      "App Name": "Auto from store",
      "CTA": "Install/Open/etc."
    },
    "media": {
      "type": "Video",
      "video_size": "800?450 or 800?800 (aspect 16:9 or 1:1)",
      "length": "?2:20",
      "max_file_size": "1 GB"
    }
  },
  {
    "platform": "X (Twitter)",
    "format": "Promoted Video (standalone)",
    "fields": {
      "Tweet Text": "280 characters",
      "CTA (Overlay)": {
        "optional": true,
        "note": "If using Video Website Card template"
      }
    },
    "media": {
      "type": "Video",
      "aspect_ratio": "16:9 or 1:1 (supports 9:16 in Immersive)",
      "resolution": "720p or 1080p (max 1080?1920 for vertical)",
      "max_file_size": "1 GB",
      "video_length": "up to 2m20s (140s)",
      "frame_rate": "?60 fps",
      "format": "MP4/MOV (H.264/AAC)"
    }
  },
  {
    "platform": "X (Twitter)",
    "format": "Vertical Video Ad (Immersive)",
    "fields": {
      "Tweet Text": "280 characters"
    },
    "media": {
      "type": "Vertical Video",
      "aspect_ratio": "9:16 (full-screen)",
      "resolution": "1080?1920 (max), 720?1280 (min)",
      "video_length": "<15s recommended (up to 2:20 supported)"
    }
  },
  {
    "platform": "X (Twitter)",
    "format": "Carousel Ad",
    "fields": {
      "Tweet Text": "280 characters",
      "Cards": "2?6 cards (images/videos)",
      "Headline per Card": {
        "limit": "70 characters (2 lines max)"
      },
      "URL per Card": {
        "note": "Unique destination per card or single for all"
      }
    },
    "media": {
      "type": "Images or Videos",
      "aspect_ratio": "All cards same: 1.91:1 (images) or 1:1 possible",
      "image_size": "800?418 (1.91:1) or 800?800 (1:1)",
      "video_size": "800?450 (16:9) or 800?800 (1:1)",
      "notes": "2-6 images/videos, swipeable"
    }
  },
  {
    "platform": "X (Twitter)",
    "format": "Promoted Poll (Conversation Card)",
    "fields": {
      "Tweet Text": {
        "limit": "280 characters",
        "note": "Acts as poll question"
      },
      "Poll Options": {
        "limit": "2?4 options, 25 characters each"
      },
      "Poll Duration": "5 min to 7 days"
    },
    "media": {
      "type": "Optional Video/Image in poll card",
      "note": "If using conversation card, a 800?450 video can accompany poll"
    }
  },
  {
    "platform": "X (Twitter)",
    "format": "Promoted Trend",
    "fields": {
      "Trend Text": {
        "limit": "~20 characters",
        "note": "Hashtag or phrase"
      }
    },
    "media": null
  },
  {
    "platform": "X (Twitter)",
    "format": "Promoted Follower Account",
    "fields": {
      "Account Name": "As per profile",
      "Bio/Description": "Short bio snippet"
    },
    "media": {
      "type": "Profile Image",
      "size": "400?400 px (standard profile)"
    }
  },
  // YouTube formats
  {
    "platform": "YouTube",
    "format": "Skippable In-Stream Ad",
    "fields": {
      "Video Title (internal)": "Used as ad name (not shown)",
      "CTA Overlay": {
        "Headline": "15-20 chars (optional, e.g. 'Try for Free')",
        "Button Text": "10 chars (e.g. 'Install')"
      },
      "Companion Banner": {
        "size": "300?60 or 300?250 px (desktop, optional)"
      }
    },
    "media": {
      "type": "Video (YouTube-hosted)",
      "aspect_ratio": "16:9 (recommended) or 9:16 (vertical)",
      "resolution": "1280?720 or higher",
      "video_length": "No limit (<3 min recommended)",
      "max_file_size": "128 GB or 12 hours (YouTube limit)",
      "format": "MP4/MOV/AVI (H.264 codec recommended)"
    }
  },
  {
    "platform": "YouTube",
    "format": "Non-Skippable In-Stream Ad",
    "fields": {
      "Video Title": "N/A (plays as ad)",
      "Companion Banner": "300?60 or 300?250 px (optional)"
    },
    "media": {
      "type": "Video",
      "aspect_ratio": "16:9",
      "resolution": "1280?720+",
      "video_length": "15s (up to 20s in some regions)",
      "max_file_size": "128 GB",
      "format": "MP4/MOV etc."
    }
  },
  {
    "platform": "YouTube",
    "format": "Bumper Ad",
    "fields": {
      "Video Title": "N/A"
    },
    "media": {
      "type": "Video",
      "aspect_ratio": "16:9",
      "resolution": "1280?720+",
      "video_length": "6 seconds max",
      "format": "MP4/MOV",
      "notes": "Non-skippable short ad"
    }
  },
  {
    "platform": "YouTube",
    "format": "In-Feed Video Ad (Discovery)",
    "fields": {
      "Title": {
        "limit": "100 characters (max)"
      },
      "Description Line 1": {
        "limit": "~35 characters"
      },
      "Description Line 2": {
        "limit": "~35 characters"
      }
    },
    "media": {
      "type": "Thumbnail Image",
      "size": "min 640?360 (16:9) or 480?480 (1:1) recommended",
      "note": "Uses YouTube video thumbnail"
    }
  },
  {
    "platform": "YouTube",
    "format": "Masthead Ad",
    "fields": {
      "Headline": {
        "limit": "~70 characters (23 chars primary visible)"
      },
      "Description": {
        "limit": "62 characters (desktop)"
      },
      "CTA Button": {
        "limit": "10 characters"
      }
    },
    "media": {
      "type": "Autoplay Video (no sound)",
      "resolution": "1920?1080 or higher",
      "video_length": "Up to 30s auto-play loop"
    }
  },
  {
    "platform": "YouTube",
    "format": "Overlay Ad (Image)",
    "fields": {
      "Text": "Short text (or image only)"
    },
    "media": {
      "type": "Image Banner",
      "size": "468?60 or 728?90 px",
      "file_types": ["GIF", "JPG", "PNG"],
      "max_file_size": "150 KB"
    }
  },
  {
    "platform": "YouTube",
    "format": "Shorts Ad (Vertical Video)",
    "fields": {
      "CTA": {
        "optional": true,
        "note": "Small overlay (e.g., 'Install')"
      }
    },
    "media": {
      "type": "Vertical Video",
      "aspect_ratio": "9:16",
      "resolution": "1080?1920",
      "video_length": "<60s (short form)",
      "format": "MP4"
    }
  }
];

async function seedAdSpecs() {
  console.log('Seeding ad specs...');
  
  try {
    // Delete existing specs
    await db.delete(adSpecs);
    
    // Insert all specs
    const specsToInsert = AD_SPECS_DATA.map(spec => ({
      platform: spec.platform,
      format: spec.format,
      specJson: spec,
      version: 1,
      isActive: true,
    }));
    
    await db.insert(adSpecs).values(specsToInsert);
    
    console.log(`? Successfully seeded ${specsToInsert.length} ad specs`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding ad specs:', error);
    process.exit(1);
  }
}

seedAdSpecs();
