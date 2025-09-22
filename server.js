import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from './app.js'
// server.js or index.js
import './services/cleanupNotifications.js'; // schedules cleanup job
import './services/suggestionsCron.js'
dotenv.config({
    path: './.env'
})
console.log("CF env:", process.env.CASHFREE_ENV);
console.log("CF APP ID set?", !!process.env.CASHFREE_APP_ID);
console.log("CF SECRET set?", !!process.env.CASHFREE_SECRET);
// NEVER console.log actual secret in production — only for local debugging.


connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})




