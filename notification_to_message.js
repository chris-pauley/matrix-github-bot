const gh = require("./github.js");
const fetch = require('node-fetch');
function get(url){
    if(!url.startsWith('http')){
        if (!url.startsWith('/')){
            url = `/${url}`;
        }
        url = `https://api.github.com${url}`;
    }
    var token = gh.__auth.token;

    return fetch(url,{
        headers: {
            'Authorization': `token ${token}`
        }
    }).then(res=>res.json());
}

async function build_pr_msg(notification) {
    var comment_json = await get(notification.subject.latest_comment_url || notification.subject.url);
    var { 
        html_url,
        user: {login}, 
        title,
        merged, 
        state,
        comments,
        comments_url,
        review_comments,
        review_comments_url,
    } = comment_json;
    var status = merged ? 'merged' : state,
        all_comments = [],
        latest_comment,
        msg_body;
    if (merged) {
        msg_body = '';
    }
    if (comments > 0){
        var notification_comments = await get(comments_url);
        all_comments.append(notification_comments);
    }
    if (review_comments > 0){
        var notification_comments = await get(review_comments_url);
        all_comments.append(notification_comments);
    }
    if(allComments.length > 0) {
        all_comments = all_comments.sort((a,b)=>{
            return new Date(b.updated_at) - new Date(a.updated_at);
        });
        latest_comment = all_comments.pop();
        msg_body = `<b><a href="${latest_comment.html_url}">${latest_comment.user.login}</a></b>:<br>${latest_comment.body}`
    } else if (!merged && state !== 'closed'){
        msg_body = `<b>${login}</b>:<br>${comment_json.body}`;
    }
    return `[${status.toUpperCase()}] <b><a href="${html_url}">${title}</a></b><br>
    ${msg_body}`;
}   

async function build_issue_msg(notification) {

}

module.exports = async function(notification){
    var title = notification.repository.full_name,
        subject = notification.subject.title,
        link = notification.repository.html_url,
        type = notification.subject.type,
        msg = '';
    switch (type){
        case 'PullRequest':
        case 'Issue':
            msg = await build_pr_msg(notification);
            break;
        default:
            msg = `<b>${title}</b> ${type} <a href="${link}">${subject}</a>`;
            break;
    }

    return msg;
}