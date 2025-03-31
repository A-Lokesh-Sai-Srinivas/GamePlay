const express = require("express")
const bodyParser = require("body-parser")
const admin = require("firebase-admin")
const path = require("path")
const session = require("express-session")
const { v4: uuidv4 } = require("uuid")
const request = require("express").request;

const serviceAccount = require("./serviceAccountKey.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const auth = admin.auth()
const db = admin.firestore()

const app = express()
const port = process.env.PORT || 3002 // Changed from 3001 to 3002

const games = [
  {
    title: 'Flappy Bird',
    path: '/games/Flappy Bird/index.html',
    image: '/images/flappy-bird.png',
    description: 'Navigate a bird through pipes without touching them!'
  },
  {
    title: 'Snake Game',
    path: '/games/Snake Game/snake.html',
    image: '/images/snake-game.png',
    description: 'Control a snake to eat apples and grow without hitting walls or yourself!'
  },
  {
    title: 'Tic Tac Toe',
    path: '/games/Tic Tac Toe/index.html',
    image: '/images/tic-tac-toe.png',
    description: 'Classic game of X and O. Play against a friend or the computer!'
  }
];

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, "public")))
app.use("/games", express.static(path.join(__dirname, "Games")))
app.set("view engine", "ejs")

app.use(
  session({
    secret: process.env.SESSION_SECRET || "game-portal-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 },
  }),
)

const checkAuth = async (req, res, next) => {
  try {
    const idToken = req.session.idToken
    if (!idToken) {
      return res.redirect("/signin?redirect=" + encodeURIComponent(req.originalUrl))
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken)
      req.user = decodedToken
      next()
    } catch (error) {
      console.error("Error verifying token:", error)
      req.session.idToken = null
      res.redirect("/signin?redirect=" + encodeURIComponent(req.originalUrl))
    }
  } catch (error) {
    console.error("Auth middleware error:", error)
    res.redirect("/signin")
  }
}

app.get('/', async (req, res) => {
  try {
    let user = null;
    if (req.session.idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(req.session.idToken);
        user = decodedToken;
      } catch (error) {
        console.error('Error verifying token:', error);
        req.session.idToken = null;
      }
    }  

    

    res.render('index', { user, games });
  } catch (error) {
    console.error('Home page error:', error);
    res.render("index", { user: null, games: [] })
  }
})

app.get("/signin", (req, res) => {
  const redirect = req.query.redirect || "/"
  res.render("signin", { error: null, success: null, redirect })
})

app.get("/signup", (req, res) => {
  res.render("signup", { error: null, success: null })
})

app.get("/game/:gameName", checkAuth, (req, res) => {
  const gamePath = path.join(__dirname, "Games", req.params.gameName, "index.html")
  res.sendFile(gamePath)
})

app.get('/games', (req, res) => {
  res.render('games', { games: games }); // Now gameList is defined before usage
})

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body

    const userRecord = await auth.getUserByEmail(email)

    const idToken = await admin.auth().createCustomToken(userRecord.uid);
    
    req.session.idToken = idToken
    req.session.user = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    }

    res.json({
      success: true,
      token: idToken,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(401).json({ success: false, error: "Invalid credentials" })
  }
})

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body

  if (!password || password.length < 6) {
    return res.render("signup", { error: "Password must be at least 6 characters long.", success: null })
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    })

    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      uid: userRecord.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.render("signin", { error: null, success: "Account created successfully! Please sign in." })
  } catch (error) {
    console.error("Error Signing Up:", error)
    res.render("signup", { error: error.message, success: null })
  }
})

app.post("/signin", async (req, res) => {
  const { email, password } = req.body
  const redirect = req.body.redirect || "/"

  try {
    const userRecord = await auth.getUserByEmail(email)

    const idToken = await admin.auth().createCustomToken(userRecord.uid);
    
    req.session.idToken = idToken
    req.session.user = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    }

    res.redirect(redirect)
  } catch (error) {
    console.error("Signin error:", error)
    res.render("signin", { error: "Invalid credentials", success: null, redirect })
  }
})

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during logout:", err)
    }
    res.redirect("/signin")
  })
})

const publicImagesDir = path.join(__dirname, "public", "images")
const fs = require("fs")
if (!fs.existsSync(publicImagesDir)) {
  fs.mkdirSync(publicImagesDir, { recursive: true })
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

