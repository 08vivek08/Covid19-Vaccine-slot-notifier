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
let quote = '', signed = false, page;
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';

let browser;
(async () => {
    browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
    console.log('opened browser');
})();

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
                    'subject': 'Deployment successful',
                    'text': quote + '\n' + quote.length
                };
                await mailer(data);
            }
        })
        .catch(function (err) {
            console.log(err);
        })
}
setInterval(() => {
    fetchurl();
}, 30000);

app.get('/', async (req, res) => {
    fetchurl(url)
        .then(() => {
            return res.status(200).json({ message: quote, length: quote.length })
        });
});
app.post('/signin', async (req, res) => {
    const data = {
        'email': 'devilemperror94@gmail.com',
        'subject': 'Yahoo automatic mailer is ready',
        'text': 'Logged In Succesful\nnow mailer is ready'
    };
    if (signed || req.headers.authorization.split(' ')[1] !== process.env.YAHOO_SECRET_KEY) { return res.status(400).json({ error: 'Admin already logged in' }); }
    let password = req.body.password;

    await page.waitForSelector('#verification-code-field', { visible: true });
    await page.type('#verification-code-field', password, { waitUntil: 'networkidle2', delay: 100 });
    
    await page.waitForSelector('#verify-code-button', { visible: true });
    await Promise.all([
        // page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#verify-code-button')
    ])
        // await page.screenshot({ path: 'login.png' })
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
            }, 20000);
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
    try {
        console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@opening page")
        page = await browser.newPage();

        await page.setDefaultTimeout(0);
        await page.setUserAgent(userAgent);

        console.log("############################opening new page");
        await page.goto('https://login.yahoo.com/', { waitUntil: 'networkidle2' });

        console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%finding username");
        await page.waitForSelector('input[name="username"]', { visible: true });
        await page.type('input[name="username"]', process.env.YAHOO_USER, { waitUntil: 'networkidle2', delay: 100 });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('#login-signin')
        ]);

        console.log("############################searching password");
        await page.waitForSelector('input[name="password"]', { visible: true });
        await page.type('input[name="password"]', password, { waitUntil: 'networkidle2', delay: 100 });

        await page.waitForSelector('#login-signin', { visible: true });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('#login-signin')
        ]);

        console.log("****************************sending otp");
        await page.waitForSelector('button[value="100"]', { visible: true });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[value="100"]')
        ]);
    }
    catch (error) {
        console.log('************************error---', error);
    }
}

const mailer = async (data) => {
    try {
        console.log('###########################data', data);
        const newPage = await browser.newPage();

        console.log('&&&&&&&&&&&&&&&&&&&&&&&opened new page');
        await newPage.setDefaultTimeout(0);
        await newPage.setUserAgent(userAgent);

        await newPage.goto('https://in.mail.yahoo.com/d/compose/', { waitUntil: 'networkidle0' });
        // console.log('Compose button')
        // await newPage.waitForSelector('a[aria-label="Compose"]', { visible: true });
        // await Promise.all([
        //     // newPage.waitForNavigation({ waitUntil: 'networkidle2' }),
        //     newPage.click('a[aria-label="Compose"]')
        // ]);
        // await newPage.screenshot({ path: 'mail.png' });
        // setTimeout(async () => {
        //     await newPage.screenshot({ path: 'bcc.png' });
        // }, 60000);
        console.log('@@@@@@@@@@@@@@@@@@@@@@searching bcc button');
        await newPage.waitForSelector('button[data-test-id="btn-cc"]');
        console.log('*****************found bcc');
        await Promise.all([
            newPage.click('button[data-test-id="btn-cc"]')
        ]);
        console.log('#################bcc clicked');

        await newPage.waitForSelector('#message-bcc-field', { visible: true });
        console.log('**************************Email address');
        await newPage.type('#message-bcc-field', data.email, { waitUntil: 'networkidle2', delay: 100 });

        console.log('------------Subject');
        await newPage.waitForSelector('input[aria-label="Subject"]', { visible: true });
        await newPage.type('input[aria-label="Subject"]', data.subject, { waitUntil: 'networkidle2', delay: 100 });
        console.log('------------Message');

        await newPage.waitForSelector('div[aria-label="Message body"]', { visible: true });
        await newPage.type('div[aria-label="Message body"]', data.text, { waitUntil: 'networkidle2', delay: 100 });

        await newPage.waitForSelector('button[title="Send this email"]', { visible: true });
        await Promise.all([
            newPage.waitForNavigation({ waitUntil: 'networkidle2' }),
            newPage.click('button[title="Send this email"]')
        ]);
        console.log('------------email sent');

        await newPage.close();
    }
    catch (error) {
        console.log('########################################ERROR:---------', error);
    }
}

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});