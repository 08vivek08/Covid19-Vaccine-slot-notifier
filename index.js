const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const got = require("got");
const api = require('./data.json');
const env = require('dotenv');
const path = require("path");
const mailer = require("./helpers/mailer");
const fetchurl = require("./helpers/fetchUrl");

env.config();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'screenshots')));
app.use(express.static(path.join(__dirname, 'public')));

let signed = false, page;
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';

let browser;
(async () => {
    browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
    console.log('opened browser');
})();

setInterval(() => {
    got.get("https://covid-19-vaccine-slot-notifier.herokuapp.com/")
        .then((res) => {
            console.log("Generated the trafic to avoid idling");
        })
        .catch(err => {
            console.log("Error in generating trafic: ", err);
        });
}, 20 * 60 * 1000);

setInterval(() => {
    if (signed)
        fetchurl(browser, 0);
}, 10000);

const validatePin = (pin) => {
    if (pin.length < 6 || pin.length > 6) return false;
    if (pin[0] != '1') return false;
    for (let i = 1; i < 6; i++) {
        if (Number(pin[i]) <= 9 && Number(pin[i]) >= 0) {
            continue;
        }
        else return false;
    }
    return true;
}

const validateEmail = (mail) => {
    var validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (mail.match(validRegex)) {
        return true;
    } else {
        return false;
    }
}

app.get('/', (req, res) => {
    res.sendFile("index.html");
});

app.post('/subscribe', (req, res) => {
    if (!req.body.pincode || !req.body.email) return res.status(400).json('Request error');
    if (!validatePin(req.body.pincode) || !validateEmail(req.body.email)) return res.status(403).json('Request error');
    if (api.locations[req.body.pincode]) {
        if (!api.locations[req.body.pincode].emails.find(email => email === req.body.email)) {
            api.locations[req.body.pincode].emails.push(req.body.email);
        }
    }
    else {
        const pin = req.body.pincode;
        api.locations[pin] = {};
        api.locations[pin].centers = [];
        api.locations[pin].emails = [req.body.email];
    }
    res.status(201).json('email added');
    let mailid = req.body.email + " \t ";
    return fetchurl(browser,1, req.body.pincode, mailid);
});

app.post('/unsubscribe', (req, res) => {
    if (!req.body.email) return res.status(400).json('Request error');
    if (!validateEmail(req.body.email)) return res.status(403).json('Request error');
    for (const pincode in api.locations) {
        console.log(api.locations[pincode].emails.length)
        if (api.locations[pincode].emails.length > 0) {
            api.locations[pincode].emails = api.locations[pincode].emails.filter(email => email != req.body.email);
        }
    }
    res.status(201).json('email removed');
    return fetchurl(browser,1);
});

app.post('/signin', async (req, res) => {
    if (signed || !req.body.password || req.headers.authorization.split(' ')[1] !== process.env.YAHOO_SECRET_KEY) { return res.status(400).json({ error: 'Admin already logged in' }); }

    console.log('########################otp recieved');
    const data = {
        'email': 'devilemperror94@gmail.com',
        'subject': 'Yahoo automatic mailer is ready',
        'text': 'Logged In Succesful\nNow Automatic Mailing service is ready'
    };
    let password = req.body.password;

    await page.waitForSelector('#verification-code-field', { visible: true });
    await page.type('#verification-code-field', password, { waitUntil: 'networkidle2', delay: 100 });

    await page.waitForSelector('#verify-code-button', { visible: true });
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#verify-code-button')
    ])
        // await page.screenshot({ path: './screenshots/login.png' })
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
            }, 100000);
            return await mailer(data, browser);
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

        ///////////////////////////////////////////////////////////////////////////
        const i1 = setTimeout(async () => {
            try {
                await page.screenshot({ path: './screenshots/at_interval60.png' });
            }
            catch (error) {
                console.log("interval 60 ss error----", error);
            }
        }, 60000);
        const i2 = setTimeout(async () => {
            await page.screenshot({ path: './screenshots/at_interval_120.png' });
        }, 120000);
        //////////////////////////////////////////////////////////////////////////

        console.log("############################opening new page");
        await page.goto('https://login.yahoo.com/', { waitUntil: 'networkidle2' });

        /////////////////////////////////////////////////////////////////////////
        // await page.screenshot({ path: './screenshots/yahoo_login.png' });
        /////////////////////////////////////////////////////////////////////////

        console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%finding username");
        await page.waitForSelector('input[name="username"]', { visible: true });

        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@username button');
        await page.type('input[name="username"]', process.env.YAHOO_USER, { waitUntil: 'networkidle2', delay: 100 });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('#login-signin')
        ]);

        /////////////////////////////////////////////////////////////////////////
        // await page.screenshot({ path: './screenshots/password.png' });
        /////////////////////////////////////////////////////////////////////////

        console.log("############################searching password");
        await page.waitForSelector('input[name="password"]', { visible: true });
        await page.type('input[name="password"]', password, { waitUntil: 'networkidle2', delay: 100 });

        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@password button');
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
        clearTimeout(i1);
        clearTimeout(i2);
    }
    catch (error) {
        console.log('************************error---', error);
    }
}

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});