const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require("fs");
const api = require('./data.json');
const env = require('dotenv');

// const noOfPost = process.argv[2];

env.config();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const url = 'https://ron-swanson-quotes.herokuapp.com/v2/quotes';
let quote = '', signed = false, page, browser;
const fetchurl = async () => {
    // console.log(api);
    // console.log(Date.now() - api.locations[0].date);
    // api.locations[0].date = Date.now();
    // fs.writeFileSync("data.json", JSON.stringify(api));
    // console.log(api);
    await fetch(url)
        .then(function (res) {
            if (!res.ok) {
                throw Error("Error");
            }
            return res.json()
        })
        .then(async (data) => {
            console.log(data);
            quote = data[0];
            console.log(quote.length);
            if (quote.length <= 50 && signed) {
                const data = {
                    'email': 'devilemperror94@gmail.com \t vivekanand081199@gmail.com',
                    'subject': 'Yahoo auotomatic mailer is ready',
                    'text': quote + '\n' + quote.length
                };
                await mailer(data);
            }
        })
        .catch(function (err) {
            console.log(err);
        })
        .finally(() => {
            setTimeout(() => {
                fetchurl();
            }, 8000);
        });
}

// fetchurl();

app.get('/', async (req, res) => {
    fetchurl(url)
        .then(() => {
            return res.status(200).json({ message: quote, length: quote.length })
        });
});
app.post('/signin', async (req, res) => {
    const data = {
        'email': 'devilemperror94@gmail.com',
        'subject': 'Yahoo auotomatic mailer is ready',
        'text': 'Logged In Succesful\nnow mailer is ready'
    };
    if (signed || req.headers.authorization.split(' ')[1] !== process.env.YAHOO_SECRET_KEY) { return res.status(400).json({ error: 'Admin already logged in' }); }
    let password = req.body.password;
    await page.type('#verification-code-field', password, { waitUntil: 'networkidle2', delay: 100 });
    await Promise.all([
        // page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#verify-code-button')
    ])
        .then(() => {
            password = '';
            res.status(200).json({
                message: req.body
            });
        })
        .catch((error) => {
            return res.status(400).json({
                error
            });
        })
        .finally(async () => {
            setTimeout(async () => {
                signed = true;
                await page.close();
            }, 30000);
            return await mailer(data);
        });
});
app.post('/admin', async (req, res) => {
    if (!signed && req.headers.authorization.split(' ')[1] === process.env.YAHOO_SECRET_KEY) {
        res.status(200).json({ message: 'Trying to login as admin' });
        return await signer(req.body.password);
    }
    else {
        return res.status(400).json({ error: 'Admin already logged in' });
    }
});

const signer = async (password) => {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    page = await browser.newPage();
    await page.goto('https://login.yahoo.com/', { waitUntil: 'networkidle2' });

    await page.waitForSelector('input[name="username"]', { visible: true });
    await page.type('input[name="username"]', process.env.YAHOO_USER, { waitUntil: 'networkidle2', delay: 10 });
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#login-signin')
    ]);

    await page.type('input[name="password"]', password, { waitUntil: 'networkidle2', delay: 10 });
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#login-signin')
    ]);

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[value="100"]')
    ]);
}

const mailer = async (data) => {
    console.log('###########################data', data);
    const newPage = await browser.newPage();

    console.log('&&&&&&&&&&&&&&&&&&&&&&&opened new page');

    await newPage.goto('https://in.mail.yahoo.com/d/compose/', { waitUntil: 'networkidle2' });

    // await newPage.waitForSelector('a[aria-label="Compose"]', { visible: true });
    // await Promise.all([
    //     // newPage.waitForNavigation({ waitUntil: 'networkidle2' }),
    //     newPage.click('a[aria-label="Compose"]')
    // ]);
    await newPage.waitForTimeout(10000);
    console.log('@@@@@@@@@@@@@@@@@@@@@@searching bcc button');
    await newPage.waitForSelector('button[data-test-id="btn-cc"]', { visible: true });
    console.log('*****************found bcc');
    await Promise.all([
        newPage.click('button[data-test-id="btn-cc"]')
    ]);
    console.log('#################bcc clicked');

    await newPage.waitForSelector('#message-bcc-field', { visible: true });
    await newPage.type('#message-bcc-field', data.email, { waitUntil: 'networkidle2', delay: 10 });

    // await newPage.waitForSelector('input[aria-label="Subject"]', { visible: true });
    await newPage.type('input[aria-label="Subject"]', data.subject, { waitUntil: 'networkidle2', delay: 10 });

    await newPage.type('div[aria-label="Message body"]', data.text, { waitUntil: 'networkidle2', delay: 10 });

    await newPage.waitForSelector('button[title="Send this email"]', { visible: true });
    await Promise.all([
        // newPage.waitForNavigation({ waitUntil: 'networkidle2' }),
        newPage.click('button[title="Send this email"]')
    ]);
    return await newPage.close();
}

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
