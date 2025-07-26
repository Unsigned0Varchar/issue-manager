const express = require("express");
const app = express();
const port = process.env.PORT || 9000;
const db = require("./connection");
const hbs = require("hbs");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Configure transporter for Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Set view engine
app.set("view engine", "hbs");
app.set("views", "./view");
app.use(express.static(__dirname + "/public"));

hbs.registerHelper("ifCond", function (v1, operator, v2, options) {
  switch (operator) {
    case "==":
      return v1 == v2 ? options.fn(this) : options.inverse(this);
    case "===":
      return v1 === v2 ? options.fn(this) : options.inverse(this);
    case "!=":
      return v1 != v2 ? options.fn(this) : options.inverse(this);
    case "!==":
      return v1 !== v2 ? options.fn(this) : options.inverse(this);
    case "<":
      return v1 < v2 ? options.fn(this) : options.inverse(this);
    case "<=":
      return v1 <= v2 ? options.fn(this) : options.inverse(this);
    case ">":
      return v1 > v2 ? options.fn(this) : options.inverse(this);
    case ">=":
      return v1 >= v2 ? options.fn(this) : options.inverse(this);
    case "&&":
      return v1 && v2 ? options.fn(this) : options.inverse(this);
    case "||":
      return v1 || v2 ? options.fn(this) : options.inverse(this);
    default:
      return options.inverse(this);
  }
});

const session = require("express-session");
app.use(
  session({
    secret: "mydevsessionsecret123",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.urlencoded({ extended: true }));

// ----------- ROUTES -----------

// SINGLE root route (fixed for deployment)
app.get("/", (req, res) => {
  res.send("App is running and connected to Railway!");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/issue_form", (req, res) => {
  res.render("issue_form");
});

app.get("/issue_table", async (req, res) => {
  const email = req.session.user?.email;
  if (!email) return res.redirect("/login");

  try {
    const [results] = await db.query("SELECT * FROM issues WHERE email = ?", [
      email,
    ]);
    res.render("issue_table", { users: results });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// ----------- SIGNUP -----------
app.post("/signupUser", async (req, res) => {
  const { name, email, password, cpassword, role } = req.body;

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const ADMIN_RECOVERY = process.env.ADMIN_RECOVERY?.toLowerCase();

  if (name.toLowerCase() === "admin") {
    return res.redirect("/signup?error=username_not_allowed");
  }

  if (
    email.toLowerCase() === ADMIN_EMAIL ||
    email.toLowerCase() === ADMIN_RECOVERY
  ) {
    return res.redirect("/signup?error=email_reserved");
  }

  if (password === ADMIN_PASSWORD) {
    return res.redirect("/signup?error=password_reserved");
  }

  if (password !== cpassword) {
    return res.redirect("/signup?error=password_mismatch");
  }

  try {
    const [existing] = await db.query(
      "SELECT * FROM user_informations WHERE name=? OR email=?",
      [name, email]
    );

    if (existing.length > 0) {
      return res.redirect("/signup?error=user_exists");
    }

    await db.query(
      "INSERT INTO user_informations (name, email, cpassword, role) VALUES (?, ?, ?, ?)",
      [name, email, password, role]
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Issue Management System",
      html: `
        <h2>Hi ${name},</h2>
        <p>🎉 You have successfully signed up!</p>
        <p><strong>Your login details:</strong></p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> ${password}</li>
        </ul>
        <p>Keep this information safe. You can now log in and submit/view issues.</p>
        <br>
        <p>Regards,<br>Issue Management Team</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("❌ Failed to send signup email:", error);
      } else {
        console.log("✅ Signup email sent: " + info.response);
      }
    });

    return res.redirect("/login?signup=success");
  } catch (err) {
    console.error("❌ Signup error:", err);
    return res.status(500).send("Server error");
  }
});

// ----------- LOGIN -----------
app.post("/login", async (req, res) => {
  const { email, cpassword } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    cpassword === process.env.ADMIN_PASSWORD
  ) {
    req.session.user = { name: "admin", role: "admin" };
    return res.redirect("/admin_panel");
  }

  try {
    const [result] = await db.query(
      "SELECT * FROM user_informations WHERE email = ? AND cpassword = ?",
      [email, cpassword]
    );

    if (result.length === 0) {
      return res.render("login", { checkmsg: true });
    }

    const name = result[0].name;
    req.session.user = { name, email };

    return res.redirect("/issue_table?login=success");
  } catch (err) {
    console.error("Login error:", err);
    return res.send("Database error");
  }
});

// ----------- LOGOUT -----------
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/login");
    }
    res.redirect("/login?logout=success");
  });
});

// (All your other routes like forgot-password, admin_panel, etc. remain the same)

// ----------- START SERVER -----------
app.listen(port, "0.0.0.0", (err) => {
  if (err) throw err;
  console.log(`Server is running at port ${port}`);
});