buildaccord:
	cp -R ./node_modules/accord/lib ./node_modules/accord/src
	../node_modules/coffee-script/bin/coffee -c node_modules/accord/lib
	find node_modules/accord/lib -iname "*.coffee" -exec rm '{}' ';'
	cd ./node_modules/accord
	npm install
	npm install --only=dev