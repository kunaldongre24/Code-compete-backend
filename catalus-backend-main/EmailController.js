var nodeoutlook = require("nodejs-nodemailer-outlook");
var referralCodeGenerator = require("referral-code-generator");

const EmailController = {
  sendUserEmail(req, res) {
    const referral = referralCodeGenerator.alpha("uppercase", 5);
    const { userMail, user, courseName, city } = req.body;
    if (!userMail || !user || !courseName || !city) {
      return res.send({ Err: "Missing Fields" });
    }
    nodeoutlook.sendEmail({
      auth: {
        user: "schweserbook@outlook.com",
        pass: "567Eight",
      },
      from: "schweserbook@outlook.com",
      to: userMail,
      subject: "Your Registeration is successful",
      html: ` 
      Hello ${user}
      <br/>
      We welcome you to the Bookstore for Free Schweser books of ${courseName}.
      <br/>
      Thank you for showing interest.
      <p>
      As we can see you are from ${city} so you are eligible for Free books to be delivered at your doorstep.
      <p>
      Your Referral Code ${referral} 
      <p>
      Ask your friends to register using your referral code while registration. Higher the points higher the chance of getting Books.
      <br/>
      If you have any questions you can check the FAQ.
      </p>
      You will be notified only if you win Free books. 
      <p>
      Thank You
      <br/>
      Regards
      <br/>
      Mahesh Sharma
      <br/>
      Mumbai<br/>
      Book Store Head Office</p>`,
      replyTo: "educacia10.10@gmail.com",

      onError: (e) => {
        return res.send({ status: 0, error: e });
      },
      onSuccess: (i) => {
        return res.send({ status: 1 });
      },
    });
  },
  sendAdminEmail(req, res) {
    const { user, userMail, phone, country, courseName, isWorking, city } =
      req.body;
    nodeoutlook.sendEmail({
      auth: {
        user: "schweserbook@outlook.com",
        pass: "567Eight",
      },
      from: "schweserbook@outlook.com",
      to: "edukacia10.10@gmail.com",
      subject: "A new user registration Available.",
      html: `
      <h2>New Registration</h2>
      
      <table style="font-family: arial, sans-serif;
        width: 100%;border-collapse:collapse;">
        <tr>
          <th style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">Name:</th>
          <td style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">${user}</td>
        </tr>
       <tr>
          <th style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">Email:</th>
          <td style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">${userMail}</td>
        </tr><tr>
          <th style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">Phone:</th>
          <td style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">${phone}</td>
        </tr><tr>
          <th style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">Country:</th>
          <td style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">${country}</td>
        </tr>
        <tr>
          <th style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">Course:</th>
          <td style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">${courseName}</td>
        </tr>
        <tr>
          <th style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">Working Professional:</th>
          <td style="border: 1px solid #222;
          text-align:left;
          padding: 8px;">${isWorking}</td>
        </tr>
        <tr>
        <th style="border: 1px solid #222;
        text-align:left;
        padding: 8px;">City:</th>
        <td style="border: 1px solid #222;
        text-align:left;
        padding: 8px;">${city}</td>
        </tr> 
        <tr>
        <th style="border: 1px solid #222;
        text-align:left;
        padding: 8px;">Time:</th>
        <td style="border: 1px solid #222;
        text-align:left;
        padding: 8px;">${Date.now()}</td>
        </tr> 
      </table>
      `,
      replyTo: "schweserbook@outlook.com",

      onError: (e) => {
        return res.send(e);
      },
      onSuccess: (i) => {
        return res.send(i);
      },
    });
  },
};

module.exports = EmailController;
