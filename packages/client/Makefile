.PHONY: tsc
tsc: clean
	./node_modules/.bin/tsc
	sed 's#/dist/#/#' package.json > dist/package.json

.PHONY: clean
clean:
	rm -rf dist tsconfig.tsbuildinfo


