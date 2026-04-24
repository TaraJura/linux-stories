make sure you have node, npm


sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

sudo -i -u postgres
  
psql
CREATE USER wikiuser WITH PASSWORD 'password';
CREATE DATABASE wikidb OWNER wikiuser;
GRANT ALL PRIVILEGES ON DATABASE wikidb TO wikiuser;
\q


wget https://github.com/Requarks/wiki/releases/latest/download/wiki-js.tar.gz
mkdir wiki
tar xzf wiki-js.tar.gz -C ./wiki
cd ./wiki

npm install
mv config.sample.yml config.yml
nano config.yml (easy setup just read it)
node server
