.PHONY: clean
clean:
	rm -rf dist tsconfig.tsbuildinfo

.PHONY: tsc
tsc: clean
	./node_modules/.bin/tsc

.PHONY: publish
publish: tsc
	sed 's#/dist/#/#' package.json > dist/package.json
	cd dist && pnpm publish

.PHONY: publish
publish-dry: tsc
	sed 's#/dist/#/#' package.json > dist/package.json
	cd dist && pnpm publish --dry-run
