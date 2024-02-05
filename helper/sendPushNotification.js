const PushNotification = require("../models/PushNotification");
var admin = require("firebase-admin");
var serviceAccount = require("../config/fly-bet-firebase-adminsdk-tt62u-69a2d87cea.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const sendPushNotification = async (userId, message) => {
  try {
    var push_tokens = await PushNotification.find({
      user_id: userId,
    }).lean();
    var reg_ids = [];
    push_tokens.forEach((token) => {
      reg_ids.push(token.fcm_token);
    });

    if (reg_ids.length > 0) {
      const payload = {
        notification: {
          title: "New Bet Available",
          body: message,
          content_available: "true",
          click_action: "https://ma.fly247.in/allOdds",
          sound: "sound",
          image:
            "https://lh3.googleusercontent.com/fife/AGXqzDmPaQ8lxM1IPsEGLPXN-EoTi7zkLpwYt38kWy5PHw6XPBramUTGs-hHe2tisrilXGD3mIBz-CicfBr6c1Z1TsQW5szH5UzTVqIMMeZciQVZ5IS1uTYuyNUK7HSM_8ScbJ05qfCq2sTq_f9f_cNDkrddAcVnYfUdbpx6hjTKuFDNVcb1VtplNSdOPfr5hEZLqtl8JNguaSYBVV7QCL0LaSCNv0mEsNvir20XoFJi_6Okma8RrK3ksxwnkRRAmHKpjwYXCYniU_ZzslaEu67L-gl4SsTZn1wfw7qU7UgjGBsqMiJbc5g6JtJkTATh1TN6mmIk6N-m7Y0wJYkQUV8G8Nx0B048yd0vKntN0QIsIz6kjKddzCT0lkapC_Y_hihi2A4XUx0zYMaLnxJ22IbiIrxY2yoSMLd1Gvfcf9gRA-Id5dBdBiJtGl0gsFNCY-Kdrwu7GMXrThtnscSTkaoGv9tbhuASCJvUJwRg13n2d7SpvjRb4DxhR3opIRpFq6vnC46D9HOeIWwrkmsoNbmlz3t0uOZczeCDI0wV-dMDCcZid6kVlyh4VedBi933CAXxlIizuUtm9V2fQOo29QjxO3BHcMgb6WUjyRoVJjK6GLpHmbkNDVgtDAEd0TKFhTbBUVtSyF6go9rVuA6X_29tZ7k2OdX3XqZfHBcMSg-EL6t5UdF0znDi0jOL4oVga4ggwsZen0DJwuWDcSwxOuDj7W7Ly9MF6N5wAP2mdZe_A9hVdD6vOJCpsj2uhNNyrl43tOyH42HMr3wmT-WGemMeL1BysWNHSGaUIURC2ydH9UobjvWiHZQZmF-qeFwfl1OEkixsrPLVhtjYiEJ55Wqfz210SYciL8hgaUz_uA2zIXDbLpG85UBtkps1HGp-h-UZnkvytwad09fMcuM25gKplzUaQniB3H7tGd11Kpcqwl5J6fnjZu9pTX7T2ojP3eTfJtz0fRLP8AY8sL7UKfJ_O1TnUTRNsnTnixafB18yuWGRh0n6rvh7m6sNVFed-V4vUNBqXCFMXR73D44Fo9kvGGES4ke_NgGJrvzaAhi7V2vkuyVjD514icEgckaViO0har2fz4Wkh7PjOhgLI7z8gAH1QHfr5M8ErR9WUactSYIXZuOfU61fZSIYHHt8vwIjoF7VgMlAU0kcRf3wp2c5zoMZZl4O5-Kaqh4AYgf9GqWJt2ZNAReVhhnaBpoRaX3Nkk3A8r62oinelabshK9oAuZ5shMz3sT2KAjaiSQ1WhysLEQvOdAwMJIWHEwD_83Q73HDoLFTsd9Ag9Rdn1hYSY2agHiRs4vCkPiUmHav1S3YtTjGUouJ8oTxZNY8dbp9xRRz4Fc7xJw1uWAk8M-vT8GTUi5DlCb9vQ0jpf3Fy2c25BuQkZJ5N2jxCmDAEOLk_4N5nHN_A6q-sDntJ2Szb7w8JBaYJ9itqT6FKK8mr8dYsxGPaqfHSdSVDdnfYc1rHkTXO4aM9va47Y-pthoj4vvOgga2tGD2SRsi0SWFAmw9u5KWo59uVARMujHSQMcIYlAJaAPZXliMUvJyrOFgP-4Hkw3-k_O4bwjNyo2cpH1kkNcsjoxPbfXwzAm8OHqs37VTgrqt_T9XWJtu9W8ReVXmOXSSJktreQ=w2160-h1257",
        },
      };

      const options = {
        priority: "high",
      };
      admin
        .messaging()
        .sendToDevice(reg_ids, payload, options)
        .then(function (response) {})
        .catch(function (error) {
          console.log(error);
        });
    }
  } catch (err) {
    console.log("Error parsing JSON string:", err);
  }
};

module.exports = sendPushNotification;
