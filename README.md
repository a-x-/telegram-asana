# Telegram Web App w/ Integrated Task tracker and more — IDE for Managers on :fire:

**[Details in Notion page (ru)](https://www.notion.so/thsm/IDE-91b81120fb364a4c81b7fcd7fc9dcb76)**

----


<img width="900" alt="Interface Screenshot 2020 Nov, 26" src="https://user-images.githubusercontent.com/6201068/100382809-2d80a800-302d-11eb-9f4f-43eed386cb8c.png">


### Technical details

The app is based on the ReactJS JavaScript framework and TDLib (Telegram Database library) compiled to WebAssembly. Try it [here](https://evgeny-nadymov.github.io/telegram-react/).

### Running locally
Install [node.js](http://nodejs.org/).

Install dependencies with:

```lang=bash
npm ci
```

This will install all the needed dependencies.

All TDLib files will be installed into node_modules/tdweb/dist/ folder. Manually copy them into the public folder with:

```lang=bash
cp node_modules/tdweb/dist/* public/
```

Run the app in development mode with:

```lang=bash
npm run start
```

Open http://localhost:3000 to view it in the browser.

### Deploying to GitHub Pages

1. **Update *homepage* property at the app's `package.json` file.**

Define its value to be the string `http://{username}.github.io/{repo-name}`, where `{username}` is your GitHub username, and `{repo-name}` is the name of the GitHub repository. Since my GitHub username is `evgeny-nadymov` and the name of my GitHub repository is `telegram-react`, I added the following property:
    
```js
//...
"homepage": "https://evgeny-nadymov.github.io/telegram-react"
```
    
2. **Generate a *production build* of your app and deploy it to GitHub Pages.**

```
$ npm run deploy
```
### References

1. [Deploying a React App (created using create-react-app) to GitHub Pages](https://github.com/gitname/react-gh-pages)
2. [Facebook's tutorial on deploying a React app to GitHub Pages](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#github-pages)
