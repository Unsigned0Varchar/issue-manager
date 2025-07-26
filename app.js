const express = require("express");
const app = express();
const port = 9000
const db = require("./connection");
const hbs = require('hbs');
const nodemailer = require('nodemailer');
require("dotenv").config();

// For Gmail SMTP (or use other providers like Outlook, Zoho, etc.)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
// configuration
app.set("view engine", "hbs");
app.set("views", "./view"); // not "view"
app.use(express.static(__dirname + "/public"));

hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
  switch (operator) {
    case '==':
      return (v1 == v2) ? options.fn(this) : options.inverse(this);
    case '===':
      return (v1 === v2) ? options.fn(this) : options.inverse(this);
    case '!=':
      return (v1 != v2) ? options.fn(this) : options.inverse(this);
    case '!==':
      return (v1 !== v2) ? options.fn(this) : options.inverse(this);
    case '<':
      return (v1 < v2) ? options.fn(this) : options.inverse(this);
    case '<=':
      return (v1 <= v2) ? options.fn(this) : options.inverse(this);
    case '>':
      return (v1 > v2) ? options.fn(this) : options.inverse(this);
    case '>=':
      return (v1 >= v2) ? options.fn(this) : options.inverse(this);
    case '&&':
      return (v1 && v2) ? options.fn(this) : options.inverse(this);
    case '||':
      return (v1 || v2) ? options.fn(this) : options.inverse(this);
    default:
      return options.inverse(this);
  }
});

const session = require("express-session");
app.use(session({
 secret: "mydevsessionsecret123",     // Required
 resave: false,                 // Recommended false
 saveUninitialized: true        // Save new sessions
}));

//middleware
app.use(express.urlencoded({extended:true}));

//routes
app.get("/", (req, res) => {
    res.render("index")
});

app.get("/signup", (req, res) => {
    res.render("signup")

});

app.get("/login", (req, res) => {
    res.render("login")

});

app.get("/issue_form", (req, res) => {
  res.render("issue_form"); // or res.sendFile() if using HTML file
});

app.get("/", (req, res) => {
  res.render("index"); // or res.sendFile if using static HTML
});

app.get("/issue_table", async (req, res) => {
  const email = req.session.user?.email;
  if (!email) return res.redirect("/login");

  try {
    const [results] = await db.query("SELECT * FROM issues WHERE email = ?", [email]);
    res.render("issue_table", { users: results });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Handle user signup

app.post("/signupUser", async (req, res) => {
  const { name, email, password, cpassword, role } = req.body;

  // Load reserved admin credentials from .env
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const ADMIN_RECOVERY = process.env.ADMIN_RECOVERY?.toLowerCase();

  // Block "admin" as username
  if (name.toLowerCase() === "admin") {
    return res.redirect("/signup?error=username_not_allowed");
  }

  // Block use of admin/recovery email
  if (email.toLowerCase() === ADMIN_EMAIL || email.toLowerCase() === ADMIN_RECOVERY) {
    return res.redirect("/signup?error=email_reserved");
  }

  // Block use of admin password
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

    // Send welcome email
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
      `
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

app.post("/login", async (req, res) => {
  const { email, cpassword } = req.body;

  // admin login still works using fixed credentials
  if (email === process.env.ADMIN_EMAIL && cpassword === process.env.ADMIN_PASSWORD) {
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

    const [issueResult] = await db.query(
      "SELECT status FROM issues WHERE username = ? OR email = ?",
      [name, email]
    );

    const hasPending = issueResult.some(
      (i) => i.status?.trim().toLowerCase() === "pending"
    );

    return res.redirect("/issue_table?login=success");
  } catch (err) {
    console.error("Login error:", err);
    return res.send("Database error");
  }
});

//handle forgot password
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const [user] = await db.query("SELECT * FROM user_informations WHERE email = ?", [email]);

    if (user.length === 0) {
      return res.redirect("/login?forgot=notfound");
    }

    const name = user[0].name;
    const password = user[0].cpassword;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🔐 Your Password | Issue Management System",
      html: `
        <h3>Hi ${name},</h3>
        <p>You requested to retrieve your password.</p>
        <p><strong>Your password is:</strong> ${password}</p>
        <br>
        <p>Please keep it secure. You can now <a href="http://localhost:9000/login">Login here</a>.</p>
        <p>– Issue Management Team</p>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Failed to send password email:", err);
        return res.redirect("/login?forgot=fail");
      } else {
        console.log("✅ Password email sent:", info.response);
        return res.redirect("/login?forgot=sent");
      }
    });

  } catch (err) {
    console.error("🚨 Error in /forgot-password:", err);
    return res.redirect("/login?forgot=fail");
  }
});

// Handle user issue submission
app.post("/userIssue", async (req, res) => {
  try {
    if (!req.session.user) {
      console.log("⚠️ User not logged in");
      return res.redirect("/login");
    }

    const { name, email } = req.session.user;
    const { department, subject, description } = req.body;

    const raisedAt = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    });

    // Check if the same issue already exists
    const [existing] = await db.query(
      "SELECT * FROM issues WHERE email = ? AND department = ? AND subject = ? AND description = ?",
      [email, department, subject, description]
    );

    if (existing.length > 0) {
      console.log("⚠️ Issue already exists");
      return res.redirect("/issue_form?submitted=true");
    }

    // Insert new issue
    await db.query(
      `INSERT INTO issues (username, email, department, subject, description, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, department, subject, description, 'pending']
    );

    // ✅ Send confirmation email to user
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "✅ Issue Raised Successfully | Issue Management System",
      html: `
        <h2>Hi ${name},</h2>
        <p>Your issue has been successfully submitted.</p>
        <h3>📌 Issue Details:</h3>
        <ul>
          <li><strong>Department:</strong> ${department}</li>
          <li><strong>Subject:</strong> ${subject}</li>
          <li><strong>Description:</strong> ${description}</li>
          <li><strong>Raised At:</strong> ${raisedAt}</li>
          <li><strong>Status:</strong> <b>Pending ⏳</b></li>
        </ul>
        <p>🕐 Our team is reviewing it and you will receive an email as soon as it is resolved.</p>
        <br>
        <p>Regards,<br/>Issue Management Team</p>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Failed to send issue confirmation email:", err);
      } else {
        console.log("✅ Issue confirmation email sent:", info.response);
      }
    });

    return res.redirect("/issue_form?submitted=true");

  } catch (err) {
    console.error("🚨 Error in /userIssue route:", err);
    return res.status(500).send("Internal Server Error");
  }
});

app.get("/issue_list", async (req, res) => {
  const email = req.session.user?.email;
  if (!email) return res.redirect("/login");

  const { status, sort } = req.query;

  try {
    let query = "SELECT * FROM issues WHERE email = ?";
    const values = [email];

    if (status === "pending" || status === "resolved") {
      query += " AND status = ?";
      values.push(status);
    }

    query += sort === "oldest" ? " ORDER BY created_at ASC" : " ORDER BY created_at DESC";

    const [results] = await db.query(query, values);

    res.render("issue_table", {
      users: results,
      filterStatus: status || "",
      filterSort: sort || "newest"
    });
  } catch (err) {
    console.error("❌ Error fetching filtered issue list:", err);
    res.status(500).send("Internal Server Error");
  }
});

//logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/login");
    }
    res.redirect("/login?logout=success");
  });
});

app.get("/admin_panel", async (req, res) => {
  if (!req.session.user || req.session.user.name !== "admin") {
    return res.status(403).send("Access denied");
  }

  const { status, sort } = req.query;

  try {
    let query = "SELECT * FROM issues WHERE 1=1";
    let values = [];

    if (status === "pending" || status === "resolved") {
      query += " AND status = ?";
      values.push(status);
    }

    if (sort === "oldest") {
      query += " ORDER BY created_at ASC";
    } else {
      query += " ORDER BY created_at DESC"; // default to newest first
    }

    const [result] = await db.query(query, values);

    res.render("admin_panel", {
      issues: result,
      filterStatus: status || "",
      filterSort: sort || "newest"
    });

  } catch (err) {
    console.error("Error fetching issues for admin:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/admin/updateStatus", async (req, res) => {
  const { id, status } = req.body;

  try {
    if (status === "resolved") {
      // ✅ Update issue status to resolved
      await db.query("UPDATE issues SET status = ?, completed_at = NOW() WHERE id = ?", [status, id]);

      // ✅ Get issue info to email
      const [issueData] = await db.query("SELECT email, subject FROM issues WHERE id = ?", [id]);
      if (!issueData || issueData.length === 0) {
        console.warn("⚠️ No issue found for ID:", id);
        return res.redirect("/admin_panel?resolvedmail=fail");
      }

      const { email, subject } = issueData[0];

      // ✅ Prepare and send resolution email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "🎉 Your Issue Has Been Resolved",
        html: `
          <h2>Hi there,</h2>
          <p>We're happy to inform you that your issue titled:</p>
          <blockquote style="font-size: 16px; font-style: italic; color: #444;">${subject}</blockquote>
          <p>has been <b>resolved</b> successfully.</p>
          <br>
          <p>Thank you for your patience!</p>
          <p><strong>Issue Management Team</strong></p>
        `
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error("❌ Failed to send resolution email:", err);
          return res.redirect("/admin_panel?resolvedmail=fail");
        } else {
          console.log("📩 Resolution email sent:", info.response);
          return res.redirect("/admin_panel?resolvedmail=sent");
        }
      });

    } else {
      // ❗ For non-resolved status, just update status
      await db.query("UPDATE issues SET status = ?, completed_at = NULL WHERE id = ?", [status, id]);
      return res.redirect("/admin_panel");
    }

  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).send("Failed to update issue status");
  }
});

app.post("/send-admin-credentials", async (req, res) => {
  try {
    const adminEmail = "adcbravo001@gmail.com";
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: "🔐 Admin Credentials - Issue Management System",
      html: `
        <h3>Here are your admin credentials:</h3>
        <ul>
          <li><strong>Username:</strong> admin@admin.com</li>
          <li><strong>Password:</strong> admin123</li>
        </ul>
        <p>Please keep this information secure.</p>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending admin credentials:", err);
        return res.redirect("/login?admincreds=fail");
      } else {
        console.log("Admin credentials sent: " + info.response);
        return res.redirect("/login?admincreds=sent");
      }
    });
  } catch (err) {
    console.error(err);
    return res.redirect("/login?admincreds=fail");
  }
});

//Create Server
app.listen(port, (err) => {
    if (err)
        throw err
    else
        console.log("Server is running at port %d:", port);
});