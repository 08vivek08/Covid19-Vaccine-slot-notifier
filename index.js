const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const fs = require("fs");
const api = require('./data.json');
const env = require('dotenv');
const path = require("path");
const got = require("got");
// const wd = require("selenium-webdriver");
// let chrome = require('selenium-webdriver/chrome');
// const cd = require("chromedriver");
// const { default: axios } = require('axios');

env.config();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'screenshots')));
app.use(express.static(path.join(__dirname, 'public')));

let signed = false, page;
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';

let browser;
(async () => {
    browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
    console.log('opened browser');
})();

// axios.get('https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?pincode=110033&date=30-05-2021', {
//     headers: {
//         'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
//     }
// })
//     .then(res => {
//         console.log(res.data);
//     })
//     .catch(err => console.log(err));

const fetchurl = (x) => {
    console.log('start',(new Date(Date.now()).toLocaleString('en-In', { timeZone: 'Asia/Kolkata' })))
    let change = 0, i = 0;
    for (const pincode in api.locations) {
        const date = new Date(Date.now());
        i++;
        // api.locations[pincode].date = date
        // console.log(date, "--dates-", date - new Date(api.locations[pincode].date));
        if (x === 1 || ((!api.locations[pincode].date || date - new Date(api.locations[pincode].date) >= 300000) && api.locations[pincode].emails.length > 0 && api.locations[pincode].emails.length > 0)) {
            const dd = date.toLocaleString('en-In', { timeZone: 'Asia/Kolkata', day: '2-digit' });
            const mm = date.toLocaleString('en-In', { timeZone: 'Asia/Kolkata', month: '2-digit' });
            const yyyy = date.toLocaleString('en-In', { timeZone: 'Asia/Kolkata', year: 'numeric' });
            let url = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?pincode=${pincode}&date=${dd + '-' + mm + '-' + yyyy}`;

            console.log(url);
            got.get(url)
                .then((res) => {
                    const data = JSON.parse(res.body);
                    // console.log(data);
                    let covaxin = 0, covishield = 0, cap = 0, above18 = 0, above45 = 0;
                    let subject = "Vaccine slots available"
                    let centers = [];
                    let text = "Vaccines available, Book ASAP.\n";
                    let mp = new Map();
                    if (!api.locations[pincode].mp) {
                        api.locations[pincode].mp = mp;
                    }
                    if (data && data.centers && data.centers.length > 0) {
                        data.centers.forEach((center) => {
                            // console.log(new Date(Date.now()), center.center_id, "^^", api.locations[pincode].mp[center.center_id], "***date***", date - new Date(api.locations[pincode].mp[center.center_id]));
                            if (!api.locations[pincode].mp[center.center_id] || (api.locations[pincode].mp[center.center_id] && date - new Date(api.locations[pincode].mp[center.center_id]) >= 21600000)) {
                                let ctr = {}, ok = 0, slots = "";
                                ctr.center_id = center.center_id;
                                ctr.name = center.name;
                                ctr.address = center.address;
                                ctr.sessions = [];
                                center.sessions.forEach((session) => {
                                    let ssn = {};
                                    // console.log(session.available_capacity);
                                    if (session.available_capacity > 0) {
                                        cap = 1;
                                        ok = 1;
                                        ssn.date = session.date;
                                        ssn.available_capacity = session.available_capacity;
                                        ssn.min_age_limit = session.min_age_limit;
                                        if (ssn.min_age_limit === 45) {
                                            above45 = 1;
                                        }
                                        else if (ssn.min_age_limit === 18) {
                                            above18 = 1;
                                        }
                                        ssn.vaccine = session.vaccine;
                                        if (ssn.vaccine === "COVISHIELD") {
                                            covishield = 1;
                                        }
                                        else if (ssn.vaccine === "COVAXIN") {
                                            covaxin = 1;
                                        }
                                        ssn.available_capacity_dose1 = session.available_capacity_dose1;
                                        ssn.available_capacity_dose2 = session.available_capacity_dose2;
                                        ctr.sessions.push(ssn);
                                        slots = slots + ssn.date + ', ' + ssn.vaccine + ', Dose1 - ' + ssn.available_capacity_dose1
                                            + ', Dose2 - ' + ssn.available_capacity_dose2 + ', Age Group - ' + ssn.min_age_limit + "+\n";
                                    }
                                });
                                if (ok) {
                                    api.locations[pincode].date = date;
                                    api.locations[pincode].mp[center.center_id] = date;
                                    text = text +
                                        "\n_______________________________________________________________\n" +
                                        "Center Name : " + center.name + "\nAddress : " + center.address + "\nSlots : \n" + slots +
                                        "_______________________________________________________________\n";
                                    centers.push(ctr);
                                }
                            }
                        });
                    }
                    if (cap && api.locations[pincode].emails.length > 0) {
                        change = 1;
                        api.locations[pincode].centers = centers;
                        if (covaxin && covishield) {
                            subject = "Covaxin and Covishield slots are available";
                        }
                        else if (covaxin) {
                            subject = "Covaxin slots are available";
                        }
                        else if (covishield) {
                            subject = "Covishield slots are available";
                        }
                        if (above18 && above45) {
                            subject = subject + " for both 18+ & 45+ age group";
                        }
                        else if (above18) {
                            subject = subject + " for 18-44 age group";
                        }
                        else if (above45) {
                            subject = subject + " for 45+ age group";
                        }
                        subject = subject + " at pincode-" + pincode;
                        const reducer = (accumulator, currentValue) => accumulator + " \t " + currentValue;
                        const email = api.locations[pincode].emails.reduce(reducer);
                        // console.log(email, subject, text);
                        mailer({ email, subject, text });
                        return change;
                    }
                })
                .then((change) => {
                    if (i === Object.keys(api.locations).length) {
                        if (x || change) {
                            fs.writeFileSync("data.json", JSON.stringify(api));
                            console.log('saved');
                        }
                        else console.log('Not Saved')
                    }
                })
                .catch((error) => {
                    console.log(error);
                });
        }
    }
}

setInterval(() => {
    if (signed)
        fetchurl(0);
}, 5000);

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
        const pin = req.body.pincode
        api.locations[pin] = {};
        api.locations[pin].centers = [];
        api.locations[pin].emails = [req.body.email];
    }
    res.status(201).json('email added');
    return fetchurl(1);
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
    return fetchurl(1);
});

app.post('/signin', async (req, res) => {
    console.log('########################otp recieved');
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

const mailer = async (data) => {
    try {
        // console.log('###########################data', data);
        const newPage = await browser.newPage();

        console.log('&&&&&&&&&&&&&&&&&&&&&&&opened new page');
        await newPage.setDefaultTimeout(0);
        await newPage.setUserAgent(userAgent);

        await newPage.goto('https://in.mail.yahoo.com/d/compose/', { waitUntil: 'networkidle2' });
        // console.log('Compose button')
        // await newPage.waitForSelector('a[aria-label="Compose"]', { visible: true });
        // await Promise.all([
        //     // newPage.waitForNavigation({ waitUntil: 'networkidle2' }),
        //     newPage.click('a[aria-label="Compose"]')
        // ]);

        /////////////////////////////////////////////////////////////////////////
        // await newPage.screenshot({ path: './screenshots/mail.png' });
        const i1 = setTimeout(async () => {
            try {
                await newPage.screenshot({ path: './screenshots/bcc.png' });
            }
            catch (error) {
                console.log('screenshot bcc.png error---', error)
            }
        }, 60000);
        /////////////////////////////////////////////////////////////////////////

        console.log('@@@@@@@@@@@@@@@@@@@@@@searching bcc button');
        await newPage.waitForSelector('button[data-test-id="btn-cc"]');
        console.log('*****************found bcc');
        await Promise.all([
            newPage.click('button[data-test-id="btn-cc"]')
        ]);
        console.log('#################bcc clicked');

        await newPage.waitForSelector('#message-bcc-field', { visible: true });
        console.log('**************************Email address');
        await newPage.type('#message-bcc-field', data.email, { waitUntil: 'networkidle2', delay: 5 });

        console.log('------------Subject');
        await newPage.waitForSelector('input[aria-label="Subject"]', { visible: true });
        await newPage.type('input[aria-label="Subject"]', data.subject, { waitUntil: 'networkidle2', delay: 5 });
        console.log('------------Message');

        await newPage.waitForSelector('div[aria-label="Message body"]', { visible: true });
        await newPage.type('div[aria-label="Message body"]', data.text, { waitUntil: 'networkidle2', delay: 5 });

        await newPage.waitForSelector('button[title="Send this email"]', { visible: true });
        await Promise.all([
            newPage.waitForNavigation({ waitUntil: 'networkidle2' }),
            newPage.click('button[title="Send this email"]')
        ]);
        console.log('------------email sent');
        clearTimeout(i1);
        await newPage.close();
    }
    catch (error) {
        console.log('########################################ERROR:---------', error);
    }
}

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});