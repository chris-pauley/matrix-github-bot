/*
    Sets up a server which handles the auth process for github,
    saves an access token at ./.gh_access_token
*/
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));  
app.use(bodyParser.json());

const port = 4545;
const client_id='ffaf36541119d00005f2';
const client_secret='9255a1b70674f244403a702a6cb97180c186dd45';

app.get('/', (req,res)=>{
    const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=user read:discussion gist notifications repo`;
    res.send(`<html><body>
    <a href="${url}">Log in to github</a>
    </body></html>`);
});

app.get('/auth', async (req,res)=>{
    const code = req.query.code;
    await (new Promise((resolve,reject)=>{
        const data = `client_id=${client_id}&client_secret=${client_secret}&code=${code}`;
        console.log(data);

        
        request.post(`https://github.com/login/oauth/access_token`,{ 
            body: data,
            headers: { 'Accept':'application/json'}
        },(err,httpResponse, body)=>{
            res.send(`Response from github: ${body}`);
            writeTokenToFile(body);
            resolve();
        })
    }));
});

app.listen(port, ()=>{
    console.log(`Listening on ${port}`)
} );

function writeTokenToFile(raw){
    var data = {};
    try {
        data = JSON.parse(raw);
    } catch(e) {
        console.error("Response from github not JSON");
        return;
    }
    fs.writeFileSync('.gh_access_token', data.access_token);
    
}