const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';

const mailer = async (data, browser) => {
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

module.exports = mailer;