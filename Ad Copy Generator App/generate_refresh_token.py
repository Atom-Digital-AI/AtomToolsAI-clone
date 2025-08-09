from google_auth_oauthlib.flow import InstalledAppFlow
from google.ads.googleads.client import GoogleAdsClient

SCOPES = ['https://www.googleapis.com/auth/adwords']
CLIENT_SECRETS_FILE = 'client_secrets.json'  # Make sure this file is in the same directory

flow = InstalledAppFlow.from_client_secrets_file(
    CLIENT_SECRETS_FILE, scopes=SCOPES)
credentials = flow.run_local_server(port=0)

print('Refresh Token:', credentials.refresh_token) 