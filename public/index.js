const email = document.getElementById('email');
const pincode = document.getElementById('pincode');
const subscribe = document.getElementById('subscribe');
const unsubscribe = document.getElementById('unsubscribe');
const message = document.getElementById('message');

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

subscribe.addEventListener("click", () => {
    const mail = email.value;
    const pin = pincode.value;
    if (!validateEmail(mail)) {
        message.innerText = 'Enter a valid email address!';
        message.classList.add('alert');
        message.classList.remove('alert-success');
        message.classList.remove('alert-danger');
        message.classList.add('alert-info');
        email.focus();
    }
    else if (!validatePin(pin)) {
        message.innerText = 'Enter a valid pincode!';
        message.classList.add('alert');
        message.classList.remove('alert-success');
        message.classList.remove('alert-info');
        message.classList.add('alert-danger');
        pincode.focus();
    }
    else {
        $.post("/subscribe", {
            email: mail,
            pincode: pin
        }).done(function(res){
            if (res) {
                email.value = "";
                pincode.value = "";
                email.value = "";
                pincode.value = "";
                message.innerText = 'You will be notified when vaccine slots will be available!';
                message.classList.add('alert');
                message.classList.remove('alert-info');
                message.classList.remove('alert-danger');
                message.classList.add('alert-success');
            }
        }).fail((error) => {
            console.log(error);
        });
    }
    setTimeout(() => {
        message.innerText = '';
        message.classList.remove('alert');
        message.classList.remove('alert-info');
        message.classList.remove('alert-danger');
        message.classList.remove('alert-success');
    }, 20000);
});
unsubscribe.addEventListener("click", () => {
    const mail = email.value;
    if (!validateEmail(mail)) {
        message.innerText = 'Enter a valid email address!';
        message.classList.add('alert');
        message.classList.remove('alert-success');
        message.classList.remove('alert-danger');
        message.classList.add('alert-info');
        email.focus();
    }
    else {
        $.post("/unsubscribe", {
            email: mail,
        }).done(function(res){
            if (res) {
                email.value = "";
                pincode.value = "";
                message.innerText = 'Your mail is removed from our database!';
                message.classList.add('alert');
                message.classList.remove('alert-info');
                message.classList.remove('alert-danger');
                message.classList.add('alert-success');
            }
        }).fail((error) => {
            console.log(error);
        });
    }
    setTimeout(() => {
        message.innerText = '';
        message.classList.remove('alert');
        message.classList.remove('alert-info');
        message.classList.remove('alert-danger');
        message.classList.remove('alert-success');
    }, 20000);
});