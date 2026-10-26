// Optional integrations for this copy of Braindead.
// Google Drive needs an OAuth client ID created in Google Cloud Console for the site's address
// (see README → "Connect Google Drive"). The ID is not a secret: Google only accepts it from the
// origins listed when it was created. The button is shown only on those origins.
window.BRAINDEAD_CONFIG = {
  google: {
    clientId: '530410767595-naovsvdsqc4lqjqujdngti1lr8vsujmc.apps.googleusercontent.com',
    origins: ['https://vicodelavega.github.io', 'http://localhost:5178'],
  },
};
