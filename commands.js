const gh = require("./github.js");

async function getNotifications(){
    const user = gh.getUser();
    const notifications = await user.listNotifications();
    const numShown = 0;
    notifications.data.forEach(async (notification) => {
        if(await this.hasSeen('notification',notification.id)){
            return;
        }
        var title = notification.repository.full_name;
        var subject = notification.subject.title;
        var link = notification.subject.url;
        var type = notification.subject.type;
        this.respond(`<b>${title}</b> ${type} <a href="${link}">${subject}</a>`);
        this.markSeen('notification', notification.id);
        numShown++;
    });
    if (numShown === 0) {
        this.respond("No new notifications");
    }
}

async function repoStatus(line) {
    var tokens = line.split(' ');
    var repoName = tokens.find(token => token.indexOf('/') > 0);
    if(!repoName) {
        this.respond("Please include repository in the form of <user>/<repo> in your request");
    }

    const [repo_user,repo_name] = repoName.split('/');
    const repo = gh.getRepo(repo_user, repo_name);

    const pullRequests = await repo.listPullRequests();
    const issues = await gh.getIssues(repo_user, repo_name).listIssues();

    this.respond(`<b>${repo_user}/${repo_name}</b> has ${pullRequests.data.length} PRs and ${issues.data.length} issues`)
}

const testRepoSummary = async function(){
    const repos = [
        "infegy/atlas",
        "infegy/canvas",
        "infegy/shared-frontend"
    ];
    var now = new Date();
    repos.forEach(async (repoURI) => {
        var repoParts = repoURI.split('/');
        var repo = gh.getRepo(...repoParts);
        var prs = (await repo.listPullRequests()).data;
        var issues = (await gh.getIssues(...repoParts).listIssues()).data;
        var message = '';
            message += `<b>${repoURI}</b> has ${prs.length} Pull Requests and ${issues.length} Issues<br>`;
        var oldPRs = [],
            newIssues = [];
        oldPRs = prs.filter((pr) =>{
            var updated = new Date(pr.updated_at);
            if((now - updated) > 86400000 * 7) {
                return true;
            }
            return false;
        });
        newIssues = issues.filter((issue) => {
            var updated = new Date(issue.updated_at);
            if ((now - updated) < 86400000) {
                return true;
            }
            return false;
        });
        if(oldPRs.length > 0) {
                message += `<b>${oldPRs.length}</b> Stale PRs, review ASAP:<br>`;
            oldPRs.forEach((pr) => {
                var date = new Date(pr.updated_at),
                    date_str = `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`
                    message += `&nbsp;&nbsp;<b><a href="${pr.html_url}">${pr.title}</a></b> last updated ${date_str}<br>`;
            });
        }
        if (newIssues.length > 0) {
                message += `<b>${newIssues.length}</b> New Issues:<br>`;
            newIssues.forEach((issue) => {
                    message += `&nbsp;&nbsp;<b><a href="${issue.html_url}">${issue.title}</a></b><br>`;
            });
        }
        this.sendMessage(this.channels.notifications, message);
    });
}

module.exports = {
    "sayhi": (body)=>{ console.log("SayHi ", body) },
    "repoStatus": repoStatus,
    "notify": getNotifications,
    "repos": testRepoSummary
}