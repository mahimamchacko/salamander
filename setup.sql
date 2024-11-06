DROP DATABASE IF EXISTS salamander;
CREATE DATABASE salamander;
\c salamander

DROP TABLE IF EXISTS users;
CREATE TABLE users
(
    id SERIAL PRIMARY KEY,
    username varchar(30),
    password varchar(100)
);

DROP TABLE IF EXISTS tokens;
CREATE TABLE tokens
(
    token varchar(64) PRIMARY KEY
);