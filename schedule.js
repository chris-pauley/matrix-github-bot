const gh = require("./github.js");

module.exports = [
    {
        schedule: '*/2 * * * *',
        action: async function checkNotifications() {
            const user = gh.getUser();
            const notifications = await user.listNotifications();
            notifications.data.forEach(async (notification) => {
                if (await this.hasSeen('notification',notification.id)) {
                    return;
                }
                var title = notification.repository.full_name,
                    subject = notification.subject.title,
                    link = notification.subject.url,
                    type = notification.subject.type;
                this.sendMessage(this.channels.notifications, `<b>${title}</b> ${type} <a href="${link}">${subject}</a>`);
                this.markSeen('notification', notification.id);
            });
        }
    }, {
        schedule: '0 09 * * *',
        action: async function() {
            const repos = [
                "infegy/atlas",
                "infegy/canvas",
                "infegy/shared-frontend"
            ];
            var now = new Date();
            repos.forEach(async (repoURI) => {
                var repo = gh.getRepo(...repoURI.split('/'));
                var prs = await repo.listPullRequests();
                var issues = await gh.getIssues().listIssues();
                this.sendMessage(this.channels.notifications,
                    `<b>${repoURI}</b> has ${prs.length} Pull Requests and ${issues.length} Issues`
                );
                var oldPRs = [],
                    newIssues = [];
                
                oldPRs = prs.filter((pr) =>{
                    var updated = new Date(pr.updated_at);
                    // if date is greater than a week, warn
                    if((now - updated) > 86400000 * 7) {
                        return false;
                    }
                    return true;
                });
                newIssues = issues.filter((issue) => {
                    var updated = new Date(pr.updated_at);
                    if ((now - updated) < 86400000) {
                        return false;
                    }
                    return true;
                });
                if(oldPRs.length > 0) {
                    this.sendMessage(this.channels.notifications,
                        `<b>${oldPRs.length}</b> Stale PRs, review ASAP:`
                    );
                    oldPRs.forEach((pr) => {
                        var date = new Date(pr.updated_at),
                            date_str = `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`
                        this.sendMessage(this.channels.notifications,
                            `\t<b><a href="${pr.url}">${pr.title}</a></b> last updated ${date_str}`
                        );
                    });
                }
                if (newIssues.length > 0) {
                    this.sendMessage(this.channels.notifications, 
                        `<b>${newIssues.length}</b> New Issues:`
                    )
                    newIssues.forEach((issue) => {
                        this.sendMessage(this.channels.notifications,
                            `\t<b><a href="${issue.url}">${issue.title}</a></b>`
                        );
                    });
                }
            });
        }
    }
]