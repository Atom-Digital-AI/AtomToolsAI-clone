from flask import Flask, render_template
from keyword_research import keyword_research_bp
from ad_copy_generator import ad_copy_bp

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# Register blueprints
app.register_blueprint(keyword_research_bp, url_prefix='/keyword-research')
app.register_blueprint(ad_copy_bp, url_prefix='/ad-copy')

@app.route('/')
def home():
    return render_template('home.html')

if __name__ == '__main__':
    app.run(debug=True, port=5001)  # Try a different port 