var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var cors = require("cors");
const upload = require("./routes/upload");

// add swagger requirement
var swaggerUi = require("swagger-ui-express");
var swaggerJSDoc = require("swagger-jsdoc");

const swaggerDefinition = {
  info: {
    title: "Covid-19 Application Swagger API",
    version: "1.0.0",
    description: "Endpoints to test the Covid-19",
  },
  host: "localhost:8000",
  basePath: "/",
  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      scheme: "bearer",
      in: "header",
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ["./routes/*.js"],
};

require("dotenv").config();

var app = express();
const CosmosClient = require("@azure/cosmos").CosmosClient;
const config = require("./config");
const QuestionList = require("./routes/questionList");
const QuestionDao = require("./models/questionDao");
const UserList = require("./routes/userList");
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "/build")));

app.use("/users", usersRouter);
app.use("/upload", upload);

const cosmosClient = new CosmosClient({
  endpoint: config.endpoint,
  key: config.key,
});
const questionDao = new QuestionDao(
  cosmosClient,
  config.databaseId,
  config.questionContainerId,
  config.answerContainerId,
  config.userContainerId
);
const questionList = new QuestionList(questionDao);
const userList = new UserList(questionDao);
questionDao
  .init((err) => {
    console.error(err);
  })
  .catch((err) => {
    console.error(err);
    console.error(
      "Shutting down because there was an error settinig up the database."
    );
    // process.exit(1)
  });
app.post("/api/changeLanguage", (req, res, next) =>
  questionList.changeQnAcontainer(req, res).catch(next)
);
app.get("/api/questions", (req, res, next) =>
  questionList.showQuestions(req, res, true).catch(next)
);
app.get("/api/questions/unanswered", (req, res, next) =>
  questionList.showQuestions(req, res, false).catch(next)
);
app.post("/api/addQuestions", (req, res, next) =>
  questionList.addQuestions(req, res).catch(next)
);

// ToDo: using :id
app.post("/api/updateQuestion", (req, res, next) =>
  questionList.editQuestion(req, res).catch(next)
);

app.post("/api/addAnswer", (req, res, next) =>
  questionList.addAnswer(req, res).catch(next)
);

app.post("/api/editAnswer", (req, res, next) =>
  questionList.editAnswer(req, res).catch(next)
);

app.post("/api/answer/like", (req, res, next) =>
  questionList.updateAnswerLike(req, res).catch(next)
);

app.post("/api/answer/report", (req, res, next) =>
  questionList.reportAnswer(req, res).catch(next)
);

app.post("/api/deleteAnswer", (req, res, next) =>
  questionList.deleteAnswer(req, res).catch(next)
);

app.post("/api/question/like", (req, res, next) =>
  questionList.updateQuestionLike(req, res).catch(next)
);

/* app.post("/api/question/report", (req, res, next) =>
  questionList.reportQuestion(req, res).catch(next)
); */

app.post("/api/addQuestion", (req, res, next) =>
  questionList.addQuestion(req, res).catch(next)
);

app.delete("/api/deleteQuestion", (req, res, next) =>
  questionList.deleteQuestion(req, res).catch(next)
);

app.get("/api/users", (req, res, next) =>
userList.showUsers(req, res, true).catch(next)
);
app.post("/api/addUser", (req, res, next) =>
  userList.addUser(req, res).catch(next)
);

app.post("/api/editUser", (req, res, next) =>
  userList.editUser(req, res).catch(next)
);

app.post("/api/validateUser", (req, res, next) =>
  userList.validateUser(req, res).catch(next)
);



app.delete("/api/deleteUser", (req, res, next) =>
userList.deleteUser(req, res).catch(next)
);

const swaggerSpec = swaggerJSDoc(options);
app.get("/swagger.json", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

// Handles any requests that don't match the ones above
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/build/index.html"));
});
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
