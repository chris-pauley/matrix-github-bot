const fs = require("fs");
const Github = require("github-api");

const gh_access_token = fs.readFileSync("./.gh_access_token");
const gh = new Github({
    token: gh_access_token
});

module.exports = gh;
