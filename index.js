import express from "express";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config();
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({ origin: 'http://localhost:5173' }));

if(!process.env.FIREBASE_SECRET_KEY) {
  console.error("FIREBASE_SECRET_KEY is not set in the environment variables. Possibly missing .env file");
  process.exit(1);
}
const serviceAccount = JSON.parse(process.env.FIREBASE_SECRET_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://getmovies-massimomatija.firebaseio.com",
});

const db = admin.firestore();

if(!process.env.JWT_SECRET_KEY) {
  console.error("JWT_SECRET_KEY is not set in the environment variables. Possibly missing .env file");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET_KEY;

const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = decoded;
    next();
  });
};


app.post("/login", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await admin.auth().getUserByEmail(email);
    const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ message: "Logged in successfully" });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(401).json({ message: "Invalid email or password" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie('token');
  res.json({ message: "Logged out successfully" });
});

app.get("/movies", authenticate, async (req, res) => {
  try {
    const snapshot = await db.collection("movies").get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (error) {
    console.error("Error getting movies:", error);
    res.status(500).json({ error: "Failed to get movies" });
  }
});


app.get("/actors",authenticate, function(req, res) {
    try {
      db.collection("actors").get().then((snapshot) => {
        const data = snapshot.docs.map(function(doc) {
          return Object.assign({id: doc.id}, doc.data());
        });
        res.json(data);
      });
    } catch (error) {
      console.error("Error getting actors:", error);
      res.status(500).json({error: "Failed to get actors"});
    }
  });
  
app.post("/movies", function(req, res) {
  try {
    const movieData = req.body;
    db.collection("movies").add(movieData).then(() => {
      res.status(201).json({message: "Movie created successfully"});
    });
  } catch (error) {
    console.error("Error creating movie:", error);
    res.status(500).json({error: "Failed to create movie"});
  }
});

app.put("/movies/:id",authenticate, function(req, res) {
  try {
    const movieId = req.params.id;
    const movieData = req.body;
    db.collection("movies").doc(movieId).set(movieData, {merge: true}).then(() => {
      res.json({message: "Movie updated successfully"});
    });
  } catch (error) {
    console.error("Error updating movie:", error);
    res.status(500).json({error: "Failed to update movie"});
  }
});

app.delete("/movies/:id",authenticate, function(req, res) {
  try {
    const movieId = req.params.id;
    db.collection("movies").doc(movieId).delete().then(() => {
      res.json({message: "Movie deleted successfully"});
    });
  } catch (error) {
    console.error("Error deleting movie:", error);
    res.status(500).json({error: "Failed to delete movie"});
  }
});


app.get("/movies-sorted-by-rating",authenticate, function(req, res) {
  try {
    db.collection("movies").orderBy("rating", "desc").get().then((snapshot) => {
      const data = snapshot.docs.map(function(doc) {
        return Object.assign({id: doc.id}, doc.data());
    });
     res.json(data);
    });
    } 
  catch (error) {
    console.error("Error getting movies:", error);
    res.status(500).json({error: "Failed to get movies sorted by rating"});
  }
  });
  app.get("/movies-filtered-by-title", function(req, res) {
    const searchTerm = req.query.title;
  try {
    // db.collection("movies").where("title", "==", searchTerm).get().then((snapshot) => {
    // const data = snapshot.docs.map(function(doc) {
    // return Object.assign({id: doc.id}, doc.data());
    // });
    // res.json(data);
    // });
    db.collection("movies")
    .orderBy("title")
    .get()
    .then((snapshot) => {
      const data = snapshot.docs.filter((doc) => {
        return doc.data().title.startsWith(searchTerm);
    }).map(function(doc) {
      return Object.assign({id: doc.id}, doc.data());
   });
     res.json(data);
   })
  } 
  catch (error) {
    console.error("Error getting movies:", error);
    res.status(500).json({error: "Failed to get movies with title: " + searchTerm});
  }
  });

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
