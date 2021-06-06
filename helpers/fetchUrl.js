const got = require("got");
const fs = require("fs");
const mailer = require("./mailer");

const fetchurl = (browser, x, pin, mailid) => {
    console.log('start', (new Date(Date.now()).toLocaleString('en-In', { timeZone: 'Asia/Kolkata' })))
    let change = 0, i = 0;
    const api = require("../data.json");
    for (const pincode in api.locations) {
        const date = new Date(Date.now());
        i++;
        // api.locations[pincode].date = date
        // console.log(date, "--dates-", date - new Date(api.locations[pincode].date));
        if (pin == pincode || ((!api.locations[pincode].date || date - new Date(api.locations[pincode].date) >= 300000) && api.locations[pincode].emails.length > 0 && api.locations[pincode].emails.length > 0)) {
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
                            if (x || !api.locations[pincode].mp[center.center_id] || (api.locations[pincode].mp[center.center_id] && date - new Date(api.locations[pincode].mp[center.center_id]) >= 6 * 60 * 60 * 1000)) {
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
                                    if (!x) {
                                        api.locations[pincode].date = date;
                                        api.locations[pincode].mp[center.center_id] = date;
                                    }
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
                        let email = x ? mailid : api.locations[pincode].emails.reduce(reducer)
                        // console.log(email, subject, text);
                        mailer({ email, subject, text }, browser);
                        return change;
                    }
                })
                .then((change) => {
                    if (i === Object.keys(api.locations).length) {
                        if (x || change) {
                            fs.writeFileSync("data.json", JSON.stringify(api));
                            console.log('saved');
                        }
                        else console.log('Not Saved');
                    }
                })
                .catch((error) => {
                    console.log(error);
                });
        }
    }
}

module.exports = fetchurl;