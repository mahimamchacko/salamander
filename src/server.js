let express = require("express");
let ejs = require("ejs");
// generates globally unique ids, we use for post ids
let uuid = require("uuid");

let hostname = "localhost";
let port = 3000;

let app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());

let posts = {};

// res.render takes name of EJS template file in views/ (without extension)
// and optional object that will be passed to template
// e.g. res.render("abc", { xyz: 123 })
// will render views/abc.ejs
// which will have access to the variable xyz with value 123

app.post("/post", (req, res) => {
  let { title, content } = req.body; // TODO validate
  let postId = uuid.v4();
  posts[postId] = { title, content };
  return res.json({ postId });
  // could also do a res.redirect and redirect them to the new post page
  // but then the client should use a <form> and <input type="submit">, not ajax
});

app.get("/post/:postId", (req, res) => {
  let { postId } = req.params;
  if (!posts.hasOwnProperty(postId)) {
    return res.status(404).send("Post not found");
  }
  let { title, content } = posts[postId];
  return res.render("post", { title, content });
});

app.get("/", (req, res) => {
  return res.render("index", { posts });
});

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});

