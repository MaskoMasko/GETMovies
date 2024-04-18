const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const serviceAccount = require("../../getmovies-9afc2-firebase-adminsdk-bl2vs-1b3a3544fe.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://getmovies-9afc2.firebaseio.com",
});

const db = admin.firestore();

app.get("/movies", function(req, res) {
  try {
    db.collection("movies").get().then((snapshot) => {
      const data = snapshot.docs.map(function(doc) {
        return Object.assign({id: doc.id}, doc.data());
      });
      res.json(data);
    });
  } catch (error) {
    console.error("Error getting movies:", error);
    res.status(500).json({error: "Failed to get movies"});
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

app.put("/movies/:id", function(req, res) {
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

app.delete("/movies/:id", function(req, res) {
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

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
