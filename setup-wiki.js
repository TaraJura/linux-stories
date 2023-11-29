make sure you have node, npm


```sudo apt install postgresql postgresql-contrib```
```sudo systemctl start postgresql```

```sudo -i -u postgres```
  
```
psql
CREATE USER wikiuser WITH PASSWORD 'password';
CREATE DATABASE wikidb OWNER wikiuser;
GRANT ALL PRIVILEGES ON DATABASE wikidb TO wikiuser;
\q
```
