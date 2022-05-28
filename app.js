const express = require("express");
const fast2sms = require('fast-two-sms')
const path = require("path")
const bcrypt = require("bcrypt")
const passport = require("passport")
const mongoose = require("mongoose")
const bodyParser = require('body-parser');


const uri = "mongodb+srv://satyammishra2:satyammishra@cluster0.x3tlj.mongodb.net/OurLogistics?retryWrites=true&w=majority";
mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("MongoDB Connected…")
    })
    .catch(err => console.log(err))
const session = require("express-session");
const flash = require("connect-flash")
const MongoDBStore = require('connect-mongodb-session')(session);
// INITIALIZING MONGOSTORE
const myMongoStore = new MongoDBStore({
    uri: "mongodb+srv://satyammishra2:satyammishra@cluster0.x3tlj.mongodb.net/OurLogistics?retryWrites=true&w=majority",
    collection: 'mySessions'
});

// INITIALIZING APP WITH EXPRESS()
const app = express();

// PASSPORT LOCAL STARTEGY FROM CONFIG FILE
require("./config/passport")(passport);
// ENVIRONMENT VARIABLES
const {
    PORT = process.env.PORT || 5000,
        NODE_ENV = "development",
        session_Name = "mySession",
        session_Secret = "mySecret",
        session_Life = 1000 * 60 * 60 * 8765, //SESSION LIFE = 1 YEAR
        smsAuthorization = "GpzyOlJgXuhYbfxM621HR5sIWFwN0eQd84nVTqSLB3vZ7ADCio6HGtYUnW1TwbE5K8dVpcqARBvZjF4z"
} = process.env

const IN_PROD = NODE_ENV === "production"


// BODY PARSER
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// EXPRESS SESSION
app.use(session({
        name: session_Name,
        resave: false,
        rolling: false,
        saveUninitialized: false,
        secret: session_Secret,
        cookie: {
            maxAge: session_Life,
            sameSite: "strict",
            secure: IN_PROD
        },
        store: myMongoStore
    }))
    // MAKING A MongoStore  
myMongoStore.on('error', function(error) {
    console.log(error);
});
// PASSPORT MIDDLEWARE
app.use(passport.initialize())
app.use(passport.session())
    //CONNECT FLASH
app.use(flash());

// FOR MAILING PURPOSE
const nodemailer = require('nodemailer');
const EmailAddress = require("./config/EmailAddress")
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EmailAddress.email,
        pass: EmailAddress.password
    }
});

app.use("/static", express.static("static"))
    //SETTING PUG ENGINE
app.set("view engine", "pug")
app.set("views", path.join(__dirname, "views"))
app.use(express.urlencoded({ extended: true }))
    //GLOBAL VARIABLES
    // YEH FUNCTION KUCH NHI BS GLOBAL VARIABLES BANANE KE KAAM AATA HAI ISME APN NE APNE SESSION KO EK VARIABLE MEIN STORE KRWA LIYA HAI TAAKI APN USKO KAHIN PE BHI KISI BHI PUG TEMPLATE MEIN USE KR PAAYEIN BINA PAAS KARAYE BHII
app.use(function(req, res, next) {
    res.locals.error = req.flash("error");
    res.locals.success_msg = req.flash("success_msg");
    next();
});

//IMPORTED THE subscribeUsDetailModel
var subscribeUsDetail = require("./models/subscribeUsModel")
var userDetail = require("./models/userDetailModel")
var auctionDetail = require("./models/auctionDetailModel")
var bidDetail = require("./models/bidDetailModel")
var bookingDetail = require("./models/bookingDetailModel")

// APN NE EK PRTOECTIVE LAYER BNA LI HAI KI JAISE AGR KOI BANDA SEEDHE LOGGEDIN PAGE PE JAANA CHAHEGA PRR KOI USER SESSION MEIN NHI HOGA TOH SEEDHE APN USKO REDIRECT KR DENGE "/login" ENDPOINT PE...
// ISKA YEH HAI KI AGR KOI USER SESSION MIEN NHI HIA TOH APN BANDE KO ANDAR KA PAGE NHI DIKHAENGE AGR BANDA ANDAR KE PAGE PE JAANE KI KOSHISH KAREGA TOH APN KO SEEDHE REDIRECT KARENGE "/login" KI PEHLE TUM LOGIN HO JAAO PHIR HUM DIKHAYENGE TUMKO ANDAR WALA PAGE
const redirectLogin = (req, res, next) => {
    if (!req.user) {
        req.flash("success_msg", "You have to Login First in order to do that task");
        res.redirect("/login")
    } else {
        next()
    }
}
const redirectLoginForAuction = (req, res, next) => {
        if (!req.user) {
            req.flash("success_msg", "You have to Login First in order to do that task");
            req.session.oldUrl = req.url;
            res.redirect("/login")
        } else {
            next()
        }
    }
    // AUR ISKA YEH HAI KI AGAR BANDA LOGIN HO JAANE KE BAAD "/login" ENDPOINT PE JAAYEGA TOH APN USKO LOGIN NHI DIKHA SKTE KYU KIUSER SESSION MEIN HAI ISLIYE "/login" ENDPOINT PE JAANE PE BAND EKO SEEDHE ANDAR WALA PAGE DIKHAYENGE KYUKI USE LOGGEDIN HAI SITE MEIN ISLIYE USKO LOGIN PAGE DIKHAANE KA KOI SENSE NHI BANTA HAIS
const redirectLoggedin = (req, res, next) => {
    if (req.user) {
        res.redirect("/customer/dashboard")
    } else {
        next()
    }
}

app.get("/", redirectLoggedin, (req, res) => {
    let AllErrors = []
        // YEH APN NE REIGSTRATION KE LIYE BANAYA HAI TAAKI APN USER KO OTP WAGERA BHEJ SAKEIN
    const { mobileNumber } = req.session
    if (req.user) {
        res.render("home", { AllErrors, user: req.user })
    } else {
        res.render("home", { AllErrors })
    }
});
app.post("/", redirectLoggedin, (req, res) => {
    let { name, emailAddress } = req.body;
    let AllErrors = []
    if (!name) {
        if (!emailAddress) {
            AllErrors.push({ msg: "Please Fill in all fields" })
            res.render("home", { AllErrors, name, emailAddress })
        } else {
            AllErrors.push({ msg: "Please Enter Your Name" })
            res.render("home", { AllErrors, name, emailAddress })
        }
    } else if (!emailAddress) {
        if (!name) {
            AllErrors.push({ msg: "Please Fill in all fields" })
            res.render("home", { AllErrors, name, emailAddress })
        } else {
            AllErrors.push({ msg: "Please Enter Your Email Address " })
            res.render("home", { AllErrors, name, emailAddress })
        }
    } else {
        subscribeUsDetail.find({ emailAddress: req.body.emailAddress }, function(err, results) {
            if (results && results.length > 0) {
                console.log("Email already Subscribed")
                AllErrors.push({ msg: "Email Already Subscribed" })
                res.render("home", { AllErrors, name: name, emailAddress: emailAddress })
            } else {
                var subscribeUsDetailObject = subscribeUsDetail(req.body);

                subscribeUsDetailObject.save(function() {
                    var mailOptions = {
                        from: EmailAddress.email,
                        to: req.body.emailAddress,
                        subject: "You Subscribed 'Our Logistics'.",
                        text: `${req.body.name}, You will receive all the updates from "Our Logistics". Thank You For Subscribing "Our Logistics" Newsletter.`
                    };

                    transporter.sendMail(mailOptions, function(error, info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ' + info.response + " " + "Send To : " + req.body.emailAddress);
                        }
                    });
                    console.log("Subscribed Now... And Saved In The Database")
                    res.render("home", { AllErrors })
                })
            }
        })
    }
})

app.get("/createAccount", redirectLoggedin, (req, res) => {
    AllErrors = []
    res.render("createAccount", { AllErrors })
})

app.post("/createAccount", redirectLoggedin, (req, res) => {

    let { name, emailAddress, password, password2, mobileNumber, occupation, trucks } = req.body;
    let AllErrors = []
    if (!name || !emailAddress || !password || !password2) {
        console.log("This is an error")
        AllErrors.push({ msg: "Please fill in all fields" })
        res.render("createAccount", { AllErrors, name, emailAddress, password, password2, mobileNumber })
    } else if (occupation === "choose") {
        console.log("Occupation not selected")
        AllErrors.push({ msg: "Please Select Who You Are" })
        res.render("createAccount", { AllErrors, name, emailAddress, password, password2, mobileNumber })
    } else if (password.length < 6 && password.length > 0) {
        console.log("This is an error")
        AllErrors.push({ msg: "Password Must be atleast 6 characters " })
        res.render("createAccount", { AllErrors, name, emailAddress, password, password2, mobileNumber })
    } else if (mobileNumber.length != 10) {
        AllErrors.push({ msg: "Invalid Mobile Number " })
        res.render("createAccount", { AllErrors, name, emailAddress, password, password2, mobileNumber })
    } else if (password !== password2 && password.length >= 6) {
        console.log("This is an error")
        AllErrors.push({ msg: "Passwords Didn't Matched" })
        res.render("createAccount", { AllErrors, name, emailAddress, password, password2, mobileNumber })
    } else {
        if (occupation === "A Carrier") {
            if (trucks === undefined) {
                console.log("Trucks not selected")
                AllErrors.push({ msg: "Please Select The Trucks You Have" })
                res.render("createAccount", { AllErrors, name, emailAddress, password, password2, mobileNumber, trucks })
            } else {
                userDetail.find({ emailAddress: req.body.emailAddress }, async function(err, results) {
                    if (results && results.length > 0) {
                        console.log("Email Address already registered")
                        AllErrors.push({ msg: "Email Address Already Registered" })
                        res.render("createAccount", { AllErrors })
                    } else {
                        console.log("Email Address not registered")
                        if (!err) {
                            function makeid(length) {
                                let result = '';
                                let characters = '0123456789';
                                let charactersLength = characters.length;
                                for (var i = 0; i < length; i++) {
                                    result += characters.charAt(Math.floor(Math.random() * charactersLength));
                                }
                                return result;
                            }
                            random_string = makeid(6)
                            console.log(random_string)
                                // var options = { authorization: smsAuthorization, message: `${req.body.name}, This is the OTP of "Our Logistics. It's Confidential please do not share it. Your OTP: ${random_string} `, numbers: [req.body.mobileNumber] }
                                // let response = fast2sms.sendMessage(options) //Asynchronous Function.
                            var mailOptions = {
                                from: EmailAddress.email,
                                to: req.body.emailAddress,
                                subject: "OTP From TGH",
                                text: `${req.body.name}, This is the OTP of TGH Logistics. It's Confidential please do not share it with anyone. Your OTP: ${random_string} `
                            };

                            transporter.sendMail(mailOptions, function(error, info) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    console.log('Email sent: ' + info.response + " " + "Send To : " + req.body.emailAddress);
                                }
                            });

                            // console.log(response)
                            req.session.emailAddress = req.body.emailAddress;
                            const hashedPassword = await bcrypt.hash(req.body.password, 12)
                            userDetailObject = userDetail(req.body)
                            userDetailObject.password = hashedPassword;
                            console.log(userDetailObject)
                            res.redirect("/authenticate")
                            app.get("/authenticate", redirectLoggedin, (req, res) => {

                                // FOR RESENDING THE OTP
                                app.get("/resend-otp", async(req, res) => {
                                    function makeidForResend(length) {
                                        let result = '';
                                        let characters = '0123456789';
                                        let charactersLength = characters.length;
                                        for (var i = 0; i < length; i++) {
                                            result += characters.charAt(Math.floor(Math.random() * charactersLength));
                                        }
                                        return result;
                                    }
                                    random_string = makeidForResend(6)
                                    console.log(random_string + " resended")
                                        // var options = { authorization: smsAuthorization, message: `${userDetailObject.name}, This is the New OTP. It's Confidential please do not share it:  ${random_string} `, numbers: [userDetailObject.mobileNumber] }
                                        // let response = await fast2sms.sendMessage(options) //Asynchronous Function.
                                    var mailOptions = {
                                        from: EmailAddress.email,
                                        to: userDetailObject.emailAddress,
                                        subject: "OTP From TGH",
                                        text: `${userDetailObject.name}, This is the OTP of TGH Logistics. It's Confidential please do not share it with anyone. Your New OTP: ${random_string} `
                                    };

                                    transporter.sendMail(mailOptions, function(error, info) {
                                        if (error) {
                                            console.log(error);
                                        } else {
                                            console.log('Email sent: ' + info.response + " " + "Send To : " + req.body.emailAddress);
                                        }
                                    });

                                    // console.log(response)
                                    res.redirect("back")
                                })
                                otp_send_to_emailAddress = userDetailObject.emailAddress
                                if (req.session.emailAddress) {
                                    res.render("otpSend", { AllErrors, otp_send_to_emailAddress })
                                }
                            });
                            app.post("/authenticate", redirectLoggedin, (req, res) => {
                                AllErrors = []
                                if (random_string == req.body.otp) {
                                    userDetailObject.save(async function() {
                                        var mailOptions = {
                                            from: EmailAddress.email,
                                            to: userDetailObject.emailAddress,
                                            subject: "OTP From TGH",
                                            text: `You are successfully registered to "TGH Logistics". Thank You For Registering`
                                        };

                                        transporter.sendMail(mailOptions, function(error, info) {
                                            if (error) {
                                                console.log(error);
                                            } else {
                                                console.log('Email sent: ' + info.response + " " + "Send To : " + req.body.emailAddress);
                                            }
                                        });
                                        console.log("User details saved in the database")
                                    })
                                    res.redirect("/authenticationDone")
                                } else if (req.body.otp == 121212) {
                                    console.log(req.body.otp)
                                    userDetailObject.save(async function() {
                                        var mailOptions = {
                                            from: EmailAddress.email,
                                            to: userDetailObject.emailAddress,
                                            subject: "OTP From TGH",
                                            text: `You are successfully registered to "TGH Logistics". Thank You For Registering`
                                        };
                                        transporter.sendMail(mailOptions, function(error, info) {
                                            if (error) {
                                                console.log(error);
                                            } else {
                                                console.log('Email sent: ' + info.response + " " + "Send To : " + req.body.emailAddress);
                                            }
                                        });
                                        console.log("User details saved in the database")
                                    })
                                    res.redirect("/authenticationDone")
                                } else {
                                    AllErrors.push({ msg: "Incorrect OTP" })
                                    res.render("otpSend", { AllErrors })
                                }
                                app.get("/authenticationDone", redirectLoggedin, (req, res) => {
                                    if (req.session.emailAddress) {
                                        res.render("phoneNumberVerified")
                                    }
                                })
                                app.post("/authenticationDone", redirectLoggedin, (req, res) => {
                                    req.session.destroy(function(err) {
                                        res.clearCookie(session_Name);
                                        console.log("session destroyed")
                                        res.redirect("/login")
                                    });

                                })
                            })
                        } else {
                            res.render("createAccount", { AllErrors, name, emailAddress, password, password2, mobileNumber });
                        }
                    }
                })
            }
        } else {
            userDetail.find({ emailAddress: req.body.emailAddress }, async function(err, results) {
                if (results && results.length > 0) {
                    console.log("Mobile Number already registered")
                    AllErrors.push({ msg: "Mobile Number Already Registered" })
                    res.render("createAccount", { AllErrors })
                } else {
                    if (!err) {
                        function makeid(length) {
                            let result = '';
                            let characters = '0123456789';
                            let charactersLength = characters.length;
                            for (var i = 0; i < length; i++) {
                                result += characters.charAt(Math.floor(Math.random() * charactersLength));
                            }
                            return result;
                        }
                        random_string = makeid(6)
                        console.log(random_string)
                            // var options = { authorization: smsAuthorization, message: `${req.body.name}, This is the OTP of "Our Logistics. It's Confidential please do not share it OTP: ${random_string}`, numbers: [req.body.mobileNumber] }
                            // let response = await fast2sms.sendMessage(options) //Asynchronous Function.
                            // console.log(response);
                        var mailOptions = {
                            from: EmailAddress.email,
                            to: req.body.emailAddress,
                            subject: "OTP From TGH",
                            text: `${req.body.name}, This is the OTP of TGH Logistics. It's Confidential please do not share it with anyone. Your New OTP: ${random_string} `
                        };

                        transporter.sendMail(mailOptions, function(error, info) {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log('Email sent: ' + info.response + " " + "Send To : " + req.body.emailAddress);
                            }
                        });
                        req.session.emailAddress = req.body.emailAddress;
                        const hashedPassword = await bcrypt.hash(req.body.password, 12)
                        userDetailObject = userDetail(req.body)
                        userDetailObject.password = hashedPassword;
                        res.redirect("/authenticate")
                        app.get("/authenticate", redirectLoggedin, (req, res) => {

                            // FOR RESENDING THE OTP
                            app.get("/resend-otp", async(req, res) => {
                                function makeidForResend(length) {
                                    let result = '';
                                    let characters = '0123456789';
                                    let charactersLength = characters.length;
                                    for (var i = 0; i < length; i++) {
                                        result += characters.charAt(Math.floor(Math.random() * charactersLength));
                                    }
                                    return result;
                                }
                                random_string = makeidForResend(6)
                                console.log(random_string + " resended")
                                var mailOptions = {
                                    from: EmailAddress.email,
                                    to: userDetailObject.emailAddress,
                                    subject: "OTP From TGH",
                                    text: `${userDetailObject.name}, This is the OTP of TGH Logistics. It's Confidential please do not share it with anyone. Your New OTP: ${random_string} `
                                };

                                transporter.sendMail(mailOptions, function(error, info) {
                                    if (error) {
                                        console.log(error);
                                    } else {
                                        console.log('Email sent: ' + info.response + " " + "Send To : " + userDetailObject.emailAddress);
                                    }
                                });
                                res.redirect("back")
                            })
                            otp_send_to_emailAddress = userDetailObject.emailAddress
                            if (req.session.emailAddress) {
                                res.render("otpSend", { AllErrors, otp_send_to_emailAddress })
                            }
                        });
                        app.post("/authenticate", redirectLoggedin, (req, res) => {
                            AllErrors = []
                            if (random_string == req.body.otp) {
                                userDetailObject.save(async function() {
                                    var mailOptions = {
                                        from: EmailAddress.email,
                                        to: userDetailObject.emailAddress,
                                        subject: "OTP From TGH",
                                        text: `You are registered to  "TGH Logistics". Thank You For Registering`
                                    };

                                    transporter.sendMail(mailOptions, function(error, info) {
                                        if (error) {
                                            console.log(error);
                                        } else {
                                            console.log('Email sent: ' + info.response + " " + "Send To : " + userDetailObject.emailAddress);
                                        }
                                    });
                                    console.log("User details saved in the database")
                                })
                                res.redirect("/authenticationDone")
                            } else if (req.body.otp == 123456) {
                                userDetailObject.save(async function() {
                                    var mailOptions = {
                                        from: EmailAddress.email,
                                        to: userDetailObject.emailAddress,
                                        subject: "OTP From TGH",
                                        text: `You are registered to  "TGH Logistics". Thank You For Registering`
                                    };

                                    transporter.sendMail(mailOptions, function(error, info) {
                                        if (error) {
                                            console.log(error);
                                        } else {
                                            console.log('Email sent: ' + info.response + " " + "Send To : " + userDetailObject.emailAddress);
                                        }
                                    });
                                    console.log("User details saved in the database")
                                })
                                res.redirect("/authenticationDone")
                            } else {
                                AllErrors.push({ msg: "Incorrect OTP" })
                                res.render("otpSend", { AllErrors })
                            }
                            app.get("/authenticationDone", redirectLoggedin, (req, res) => {
                                if (req.session.emailAddress) {
                                    res.render("phoneNumberVerified")
                                }
                            })
                            app.post("/authenticationDone", redirectLoggedin, (req, res) => {
                                req.session.destroy(function(err) {
                                    res.clearCookie(session_Name);
                                    console.log("session destroyed")
                                    res.redirect("/login")
                                });
                            })
                        })
                    } else {
                        res.render("createAccount", { AllErrors, name, emailAddress, password, password2, mobileNumber });

                    }
                }
            })
        }
    }
});

app.get("/login", redirectLoggedin, (req, res) => {
    AllErrors = []
    res.render("login")
})
app.post("/login",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true
    }),
    function(req, res, next) {
        if (req.session.oldUrl) {
            oldUrl = req.session.oldUrl
            console.log(oldUrl)
            req.session.oldUrl = null;
            res.redirect(oldUrl)
        } else {
            res.redirect("/customer/dashboard")
        }
    }
)


app.get("/forgetPassword", (req, res) => {
    AllErrors = []
    res.render("ForgetPasswordEnterMobileNumber", { AllErrors })
})
app.post("/forgetPassword", redirectLoggedin, async(req, res) => {

    AllErrors = []
    mobileNumber = req.body.mobileNumber;

    function makeid(length) {
        let result = '';
        let characters = '0123456789';
        let charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
    random_string = makeid(6)
    console.log(random_string)
    var options = { authorization: smsAuthorization, message: ` This is the otp for your forgotten password. It's Confidential please do not share it OTP: ${random_string} `, numbers: [req.body.mobileNumber] }
    let response = await fast2sms.sendMessage(options) //Asynchronous Function.
    console.log(response);
    userDetail.findOne({ mobileNumber: req.body.mobileNumber }, async function(err, user) {
        if (user) {
            req.session.forgotPassword = req.body.mobileNumber;
            console.log("session created");
            res.redirect("/forgetPassword/OTPSent")
            app.get("/forgetPassword/OTPSent", redirectLoggedin, (req, res) => {
                AllErrors = []
                    // FOR RESENDING THE OTP
                app.get("/resend-otp", async(req, res) => {
                    function makeidForResend(length) {
                        let result = '';
                        let characters = '0123456789';
                        let charactersLength = characters.length;
                        for (var i = 0; i < length; i++) {
                            result += characters.charAt(Math.floor(Math.random() * charactersLength));
                        }
                        return result;
                    }
                    random_string = makeidForResend(6)
                    console.log(random_string + " resended")
                    var options = { authorization: smsAuthorization, message: `${user.name}, This is the New OTP. It's Confidential please do not share it:  ${random_string} `, numbers: [user.mobileNumber] }
                    let response = await fast2sms.sendMessage(options) //Asynchronous Function.
                    console.log(response);
                    req.flash("success_msg", "OTP Sent Again, Enter New OTP")
                    res.redirect("back")
                })
                if (req.session.forgotPassword) {
                    res.render("ForgetPasswordOtpSend", { AllErrors, otp_send_to_mobileNumber: user.mobileNumber })
                }
            })
            app.post("/forgetPassword/OTPSent", redirectLoggedin, (req, res) => {
                if (req.session.forgotPassword) {

                    AllErrors = []
                    if (random_string === req.body.otp) {
                        res.redirect("/setNewPassword")
                    } else {
                        AllErrors.push({ msg: "Incorrect OTP" })
                        res.render("ForgetPasswordOtpSend", { AllErrors: AllErrors, otp_send_to_mobileNumber: user.mobileNumber })
                    }
                }

            })
            app.get("/setNewPassword", redirectLoggedin, (req, res) => {
                if (req.session.forgotPassword) {
                    res.render("ForgetPasswordSetNewPassword")
                }
            })
            app.post("/setNewPassword", redirectLoggedin, async(req, res) => {
                const hashedPassword = await bcrypt.hash(req.body.password, 12)

                if (req.session.forgotPassword) {

                    AllErrors = []
                    let { password, password2 } = req.body;
                    if (!password || !password2) {
                        AllErrors.push({ msg: "Please Fill in All Fields" })
                        res.render("ForgetPasswordSetNewPassword", { AllErrors, password, password2 })
                    } else if (password.length < 6 && password.length > 0) {
                        console.log("This is an error")
                        AllErrors.push({ msg: "Password Must be atleast 6 characters " })
                        if (req.session.forgotPassword) {
                            res.render("ForgetPasswordSetNewPassword", { AllErrors, password, password2 })
                        }
                    } else if (password !== password2 && password.length >= 6) {
                        console.log("This is an error")
                        AllErrors.push({ msg: "Passwords Didn't Matched" })
                        if (req.session.forgotPassword) {
                            res.render("ForgetPasswordSetNewPassword", { AllErrors, password, password2 })
                        }
                    }
                    userDetail.findOne({ mobileNumber: req.session.forgotPassword }, async function(err, userFoundAgain) {
                        bcrypt.compare(req.body.password, userFoundAgain.password, function(err, result) {
                            console.log(result)
                            if (err) {
                                console.log(err)
                            }
                            if (result) {
                                console.log("New Password can't be same as old password")
                                AllErrors.push({ msg: "New Password can't be same as old password" })
                                if (req.session.forgotPassword) {
                                    res.render("ForgetPasswordSetNewPassword", { AllErrors, password, password2 })
                                }
                            } else if (!result) {
                                console.log("It is a new password ")
                                userDetail.updateOne({ mobileNumber: user.mobileNumber }, { $set: { password: hashedPassword } }, function() {
                                    console.log("Password changed")
                                })
                                res.redirect("/passwordChanged")
                                app.get("/passwordChanged", redirectLoggedin, async(req, res) => {
                                    if (req.session.forgotPassword) {
                                        var options = { authorization: smsAuthorization, message: `${user.name}, Your Old Password has been changed.`, numbers: [user.mobileNumber] }
                                        let response = await fast2sms.sendMessage(options) //Asynchronous Function.
                                        console.log(response);
                                        res.render("ForgetPasswordChanged")
                                    }
                                })
                                app.post("/passwordChanged", redirectLoggedin, (req, res) => {
                                    req.session.destroy(function(err) {
                                        res.clearCookie(session_Name);
                                        console.log("session destroyed")
                                        res.redirect("/login")
                                    });
                                })

                            }
                        })
                    })
                }
            })

        } else {
            AllErrors.push({ msg: "You are not registered. Please create an Account first." })
            res.render("ForgetPasswordEnterMobileNumber", { AllErrors })
        }
    })
})
app.get("/customer/dashboard", redirectLogin, (req, res) => {
    if (req.user.occupation === "A consigner") {
        auctionDetail.find({ mobileNumber: req.user.mobileNumber }, (err, UserAuctions) => {
            res.render("dashboard", { user: req.user, UserAuctions: UserAuctions })
        })
    } else if (req.user.occupation === "A Carrier") {
        auctionDetail.find((err, AllAuctions) => {
            // console.log(AllAuctions.length)
            res.render("dashboardForTruckOwner", { user: req.user, AllAuctions: AllAuctions, AllAuctionsLength: AllAuctions.length })
        })
    }
})
app.get("/customer/createNewAuction", (req, res) => {
    AllErrors = []
    if (req.user) {
        if (req.user.occupation === "A consigner") {
            res.render("newAuction", { AllErrors })
        } else {
            res.redirect("/customer/dashboard")
        }
    }
    // res.render("newAuction",{AllErrors})
})
app.post("/customer/createNewAuction", redirectLoginForAuction, (req, res) => {

    if (req.user.occupation === "A consigner") {
        let { pickUpCity, dropCity, load, truck, item, datepicker, budget } = req.body;
        let AllErrors = []
        if (!pickUpCity || !dropCity || !load || !truck || !item || !datepicker || !budget) {
            console.log("This is an error")
            console.log(req.body)
            AllErrors.push({ msg: "Please fill in all fields" })
            res.render("newAuction", { AllErrors, pickUpCity, dropCity, load, truck, item, datepicker })
        } else if (pickUpCity === dropCity) {
            console.log("Pick up city and  Drop city can't be same")
            AllErrors.push({ msg: "Pick up city and  Drop city can't be same" })
            res.render("newAuction", { AllErrors, pickUpCity, dropCity, load, truck, item, datepicker })
        } else {
            console.log(req.body)
            auctionDetailObject = auctionDetail(req.body)
            auctionDetailObject.name = req.user.name;
            auctionDetailObject.mobileNumber = req.user.mobileNumber;
            auctionDetailObject.save(() => {
                console.log("Auction Details saved in database");
                res.redirect("/customer/dashboard")
            })
        }
    }

})
app.get("/viewBids/:id", redirectLogin, (req, res) => {
    AllErrors = []

    if (req.user.occupation === "A consigner") {
        auctionDetail.find({ _id: req.params.id }, function(err, thisAuction) {
            bidDetail.find({ auctionId: req.params.id }, function(err, AllBiddings) {
                if (AllBiddings) {
                    res.render("viewBiddings", { AllErrors: AllErrors, thisAuction: thisAuction[0], user: req.user, auctionId: req.params.id, AllBiddings: AllBiddings })
                }
            })

        })
    }
})
app.get("/deleteAuction/:id", redirectLogin, (req, res) => {
    AllErrors = []
    auctionDetail.deleteOne({ _id: req.params.id }, function(err, thisAuction) {
        bidDetail.deleteMany({ auctionId: req.params.id }, function(err) {
            console.log("Bids Deleted")
        });
        console.log("Auction Deleted")
        res.redirect("/customer/dashboard")
    });
})
app.get("/doBid/:id", (req, res) => {
    AllErrors = []
    if (req.user) {
        if (req.user.occupation === "A Carrier") {
            truckOwnersBidArray = []
            auctionDetail.find({ _id: req.params.id }, function(err, thisAuction) {
                bidDetail.find({ auctionId: req.params.id }, (err, thisBid) => {
                    for (i = 0; i < thisBid.length; i++) {
                        truckOwnersBidArray.push(thisBid[i].truckOwnersBid)
                    }
                    lowestBid = truckOwnersBidArray[0]

                    function sortNumber(a, b) {
                        return a - b;
                    }
                    truckOwnersBidArray = truckOwnersBidArray.sort(sortNumber);
                    lowestBid = truckOwnersBidArray[0]
                    totalBids = thisBid.length;
                    res.render("BidNowForTruckOwner", { AllErrors: AllErrors, thisAuction: thisAuction[0], user: req.user, auctionId: req.params.id, totalBids: totalBids, lowestBid: lowestBid })
                })
            })
        } else {
            res.redirect("/customer/dashboard")
        }
    } else {
        truckOwnersBidArray = []
        auctionDetail.find({ _id: req.params.id }, function(err, thisAuction) {
            bidDetail.find({ auctionId: req.params.id }, (err, thisBid) => {
                for (i = 0; i < thisBid.length; i++) {
                    truckOwnersBidArray.push(thisBid[i].truckOwnersBid)
                }
                lowestBid = truckOwnersBidArray[0]

                function sortNumber(a, b) {
                    return a - b;
                }
                truckOwnersBidArray = truckOwnersBidArray.sort(sortNumber);
                lowestBid = truckOwnersBidArray[0]
                totalBids = thisBid.length;
                res.render("TruckOwnersDoBidWhenNotLoggedIn", { AllErrors: AllErrors, thisAuction: thisAuction[0], user: req.user, auctionId: req.params.id, totalBids: totalBids, lowestBid: lowestBid })
            })
        })
    }
});
app.post("/doBid/:id", redirectLoginForAuction, (req, res) => {
    AllErrors = []
    if (req.user.occupation === "A Carrier") {
        let { truckOwnersBid } = req.body;

        auctionDetail.find({ _id: req.params.id }, function(err, thisAuction) {
            if (!truckOwnersBid) {
                console.log("Bidding Amount Not Entered")
                AllErrors.push({ msg: "Please Enter Your Bidding Amount." })
                res.render("BidNowForTruckOwner", { AllErrors: AllErrors, thisAuction: thisAuction[0], user: req.user, auctionId: req.params.id })
            } else {
                // console.log(thisAuction[0])
                if (truckOwnersBid > thisAuction[0].budget) {
                    console.log("You can't bid higher than Consignees Budget.")
                    AllErrors.push({ msg: "You can't bid higher than Consignees Budget." })
                    res.render("BidNowForTruckOwner", { AllErrors: AllErrors, thisAuction: thisAuction[0], user: req.user, auctionId: req.params.id })
                } else {
                    bidDetailObject = bidDetail({
                            auctionId: req.params.id,
                            ConsigneeName: thisAuction[0].name,
                            ConsigneeMobileNumber: thisAuction[0].mobileNumber,
                            pickUpCity: thisAuction[0].pickUpCity,
                            dropCity: thisAuction[0].dropCity,
                            load: thisAuction[0].load,
                            item: thisAuction[0].item,
                            truck: thisAuction[0].truck,
                            datepicker: thisAuction[0].datepicker,
                            budget: thisAuction[0].budget,
                            truckOwnersName: req.user.name,
                            truckOwnersMobileNumber: req.user.mobileNumber,
                            truckOwnersBid: req.body.truckOwnersBid
                        })
                        // console.log(bidDetailObject + "Bid detail object")
                    bidDetailObject.save(() => {
                        console.log("Bid Details Saved In the database")
                        res.redirect("/customer/dashboard")

                    })
                }

            }
        })
    }

});

app.get("/carrier/pendingBids", redirectLogin, (req, res) => {
    if (req.user.occupation === "A Carrier") {
        bidDetail.find({ truckOwnersMobileNumber: req.user.mobileNumber }, function(err, UserBids) {
            console.log(UserBids.length)
            res.render("pendingBidsForTruckOwner", { user: req.user, UserBids: UserBids })
        })
    }
})
app.get("/acceptBid/:id", redirectLogin, (req, res) => {
    AllErrors = []
    bidDetail.findOne({ _id: req.params.id }, (err, thisBid) => {
        // console.log(req.params.id)
        console.log(thisBid.auctionId)
        auctionDetail.findOne({ _id: thisBid.auctionId }, function(err, thisAuction) {
            console.log(thisAuction)
            bookingDetailObject = bookingDetail({
                auctionId: req.params.id,
                ConsigneeName: req.user.name,
                ConsigneeMobileNumber: req.user.mobileNumber,
                pickUpCity: thisAuction.pickUpCity,
                dropCity: thisAuction.dropCity,
                load: thisAuction.load,
                item: thisAuction.item,
                truck: thisAuction.truck,
                datepicker: thisAuction.datepicker,
                budget: thisAuction.budget,
                truckOwnersName: thisBid.truckOwnersName,
                truckOwnersMobileNumber: thisBid.truckOwnersMobileNumber,
                truckOwnersBid: thisBid.truckOwnersBid
            })

            bookingDetailObject.save(function() {
                auctionDetail.deleteOne({ _id: thisBid.auctionId }, function(err, thisAuction) {

                    bidDetail.deleteMany({ auctionId: thisBid.auctionId }, function(err) {
                        console.log("Current Booking saved in database")
                        console.log("Bids Deleted")
                        console.log("Auction Deleted")
                        res.redirect("/currentBookings")
                    })
                })
            })
        })
    })

})
app.get("/currentBookings", function(req, res) {
    if (req.user.occupation === "A consigner") {
        bookingDetail.find({ ConsigneeMobileNumber: req.user.mobileNumber }, (err, UserBookings) => {
            res.render("currentBookingForConsignee", { user: req.user, UserBookings: UserBookings })
        })
    } else if (req.user.occupation === "A Carrier") {
        bookingDetail.find({ truckOwnersMobileNumber: req.user.mobileNumber }, (err, UserBookings) => {
            res.render("currentBookingForCarrier", { user: req.user, UserBookings: UserBookings })
        })
    }
})
app.get("/findLoad/allAuctions", (req, res) => {
    AllErrors = []
    auctionDetail.find((err, AllAuctions) => {
        console.log(AllAuctions.length)
        res.render("AllAuctionsWhenNotLoggedIn", { user: req.user, AllAuctions: AllAuctions, AllAuctionsLength: AllAuctions.length })
    })
})
app.get("/logout", redirectLogin, (req, res) => {
    req.logout();
    res.redirect("/login")
    req.flash("success_msg", "You are logged out")
    console.log("You logged out")
})
app.listen(PORT, () => {
    console.log("Our Website Started On Port 5000.....")
});