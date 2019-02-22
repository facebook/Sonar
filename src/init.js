/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Provider} from 'react-redux';
import ReactDOM from 'react-dom';
import {ContextMenuProvider} from 'flipper';
import {precachedIcons} from './utils/icons.js';
import GK from './fb-stubs/GK.js';
import {init as initLogger} from './fb-stubs/Logger';
import App from './App.js';
import BugReporter from './fb-stubs/BugReporter.js';
import {createStore} from 'redux';
import {persistStore} from 'redux-persist';
import reducers from './reducers/index.js';
import dispatcher from './dispatcher/index.js';
import TooltipProvider from './ui/components/TooltipProvider.js';
import config from './utils/processConfig.js';
import {initLauncherHooks} from './utils/launcher.js';
const path = require('path');

const store = createStore(
  reducers,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
);
persistStore(store);

const logger = initLogger(store);
const bugReporter = new BugReporter(logger, store);
dispatcher(store, logger);
GK.init();

const AppFrame = () => (
  <TooltipProvider>
    <ContextMenuProvider>
      <Provider store={store}>
        <App logger={logger} bugReporter={bugReporter} />
      </Provider>
    </ContextMenuProvider>
  </TooltipProvider>
);

function init() {
  // $FlowFixMe: this element exists!
  ReactDOM.render(<AppFrame />, document.getElementById('root'));
  // $FlowFixMe: service workers exist!
  navigator.serviceWorker
    .register(
      process.env.NODE_ENV === 'production'
        ? path.join(__dirname, 'serviceWorker.js')
        : './serviceWorker.js',
    )
    .then(r => {
      (r.installing || r.active).postMessage({precachedIcons});
    })
    .catch(console.error);

  initLauncherHooks(config(), store);
}

// make init function callable from outside
window.Flipper.init = init;
