const swconf = {
  version: "c333636974a2b661480a",
  purge: false,
  legacyMigration: {
    id: 'chirpy-root-2026-11',
    scope: 'https://zong-liang.github.io/',
    before: '2026-11-03T00:00:00Z'
  },
  resources: [
    
    "/","/assets/css/wobble.css","/assets/css/wobble-fonts.css","/assets/js/data/search.json","/app.min.js","/assets/js/dist/theme.min.js","/assets/js/dist/home.min.js","/assets/js/dist/commons.min.js","/assets/js/dist/post.min.js","/assets/js/dist/page.min.js","/assets/js/dist/misc.min.js","/assets/js/dist/categories.min.js",
    "/archives/","/categories/","/tags/","/topics/","/projects/","/about/",
  ],
  denyPaths: [
    "/sw.min.js",
    "/assets/js/data/swconf.js",
    
  ],
  // Only static dependency origins may enter this app's runtime cache.
  externalOrigins: ['https://cdn.jsdelivr.net', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com']
};
