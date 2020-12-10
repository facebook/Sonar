(window.webpackJsonp=window.webpackJsonp||[]).push([[55],{127:function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return l})),n.d(t,"metadata",(function(){return s})),n.d(t,"rightToc",(function(){return o})),n.d(t,"default",(function(){return c}));var i=n(3),a=n(7),r=(n(0),n(138)),l={id:"js-plugin-api",title:"Desktop Plugin API"},s={unversionedId:"extending/js-plugin-api",id:"extending/js-plugin-api",isDocsHomePage:!1,title:"Desktop Plugin API",description:"The APIs shown here are deprecated. The APIs exposed from flipper-plugin should be preferred instead.",source:"@site/../docs/extending/js-plugin-api.mdx",slug:"/extending/js-plugin-api",permalink:"/docs/extending/js-plugin-api",editUrl:"https://github.com/facebook/flipper/blob/master/website/../docs/extending/js-plugin-api.mdx",version:"current",sidebar:"extending",previous:{title:"UI Components",permalink:"/docs/extending/ui-components"},next:{title:"Implementing a Flipper Client",permalink:"/docs/extending/new-clients"}},o=[{value:"init()",id:"init",children:[]},{value:"Client",id:"client",children:[{value:"call",id:"call",children:[]},{value:"subscribe",id:"subscribe",children:[]},{value:"supportsMethod",id:"supportsmethod",children:[]},{value:"send (DEPRECATED)",id:"send-deprecated",children:[]}]},{value:"Props",id:"props",children:[{value:"persistedState",id:"persistedstate",children:[]},{value:"setPersistedState",id:"setpersistedstate",children:[]},{value:"selectPlugin",id:"selectplugin",children:[]},{value:"deepLinkPayload",id:"deeplinkpayload",children:[]},{value:"isArchivedDevice",id:"isarchiveddevice",children:[]}]},{value:"Background Plugins",id:"background-plugins",children:[]},{value:"Notifications",id:"notifications",children:[]},{value:"Type Parameters",id:"type-parameters",children:[]}],p={rightToc:o};function c(e){var t=e.components,n=Object(a.a)(e,["components"]);return Object(r.b)("wrapper",Object(i.a)({},p,n,{components:t,mdxType:"MDXLayout"}),Object(r.b)("div",{class:"warning"},"The APIs shown here are deprecated. The APIs exposed from [`flipper-plugin`](/docs/extending/flipper-plugin) should be preferred instead."),Object(r.b)("div",{class:"warning"},Object(r.b)("p",null,"This page describes the JavaScript API that is used to implement plugins inside the Flipper Desktop application. For the JavaScript API that can be used inside React Native to communicate with the Flipper Desktop, see ",Object(r.b)("a",Object(i.a)({parentName:"p"},{href:"create-plugin"}),"Client Plugin API"),".")),Object(r.b)("p",null,"Provided a plugin is setup as defined in ",Object(r.b)("a",Object(i.a)({parentName:"p"},{href:"js-setup"}),"Desktop Plugin Development"),", the basic requirement of a Flipper plugin is that ",Object(r.b)("inlineCode",{parentName:"p"},"index.tsx")," exports a default class that extends ",Object(r.b)("inlineCode",{parentName:"p"},"FlipperPlugin"),"."),Object(r.b)("p",null,Object(r.b)("inlineCode",{parentName:"p"},"FlipperPlugin")," is an extension of ",Object(r.b)("inlineCode",{parentName:"p"},"React.Component")," with extra Flipper-related functionality. This means to define the UI of your plugin, you just need to implement this React component."),Object(r.b)("p",null,"Below is a reference of the APIs available to the ",Object(r.b)("inlineCode",{parentName:"p"},"FlipperPlugin")," class."),Object(r.b)("h2",{id:"init"},"init()"),Object(r.b)("p",null,Object(r.b)("inlineCode",{parentName:"p"},"FlipperPlugin")," has an ",Object(r.b)("inlineCode",{parentName:"p"},"init()")," method which can be overridden by plugins. Use this to make any initial calls to the client, and set up subscriptions. Only after ",Object(r.b)("inlineCode",{parentName:"p"},"init()")," is called will the ",Object(r.b)("inlineCode",{parentName:"p"},"client")," object be set."),Object(r.b)("h2",{id:"client"},"Client"),Object(r.b)("p",null,"This object is provided for communicating with the client plugin, and is accessible using ",Object(r.b)("inlineCode",{parentName:"p"},"this.client")," inside ",Object(r.b)("inlineCode",{parentName:"p"},"FlipperPlugin")," after ",Object(r.b)("inlineCode",{parentName:"p"},"init()")," has been called. Methods called on it will be routed to the client plugin with the same identifier as the JS plugin."),Object(r.b)("h3",{id:"call"},"call"),Object(r.b)("p",null,Object(r.b)("inlineCode",{parentName:"p"},"client.call(method: string, params: Object): Promise<Object>")),Object(r.b)("p",null,"Call a method on your client plugin implementation. Call ",Object(r.b)("inlineCode",{parentName:"p"},".catch()")," on the returned promise to handle any errors returned from the client."),Object(r.b)("h3",{id:"subscribe"},"subscribe"),Object(r.b)("p",null,Object(r.b)("inlineCode",{parentName:"p"},"client.subscribe(method: string, callback: (Object => void)): void")),Object(r.b)("p",null,"Subscribe to messages sent proactively from the client plugin."),Object(r.b)("h3",{id:"supportsmethod"},"supportsMethod"),Object(r.b)("p",null,Object(r.b)("inlineCode",{parentName:"p"},"client.supportsMethod(method: string): Promise<Boolean>")),Object(r.b)("p",null,"Resolves to true if the client supports the specified method. Useful when adding functionality to existing plugins, when connectivity to older clients is still required. Also useful when client plugins are implemented on multitple platforms and don't all have feature parity."),Object(r.b)("h3",{id:"send-deprecated"},"send (DEPRECATED)"),Object(r.b)("p",null,Object(r.b)("inlineCode",{parentName:"p"},"client.send(method, params): void")),Object(r.b)("p",null,"Use call instead which allows error handling and tracking."),Object(r.b)("h2",{id:"props"},"Props"),Object(r.b)("p",null,"Since ",Object(r.b)("inlineCode",{parentName:"p"},"FlipperClient")," inherits from ",Object(r.b)("inlineCode",{parentName:"p"},"React.Component")," we've defined some props that are provided. The main ones are explained below. Consult the code for the full set."),Object(r.b)("h3",{id:"persistedstate"},"persistedState"),Object(r.b)("p",null,"As well as React state, a FlipperPlugin also has persisted state. This state is retained even when the plugin is not active, for example when the user is using a different plugin, or when a client is temporarily disconnected, however it is not persisted across restarts of Flipper (by default)."),Object(r.b)("p",null,"Like React state, it should ",Object(r.b)("strong",{parentName:"p"},"never")," be modified directly. Instead, you should use the ",Object(r.b)("inlineCode",{parentName:"p"},"setPersistedState")," prop."),Object(r.b)("p",null,"If using persisted state, make sure to set a ",Object(r.b)("strong",{parentName:"p"},"static")," ",Object(r.b)("inlineCode",{parentName:"p"},"defaultPersistedState")," in your class, so that the state is correctly initialized."),Object(r.b)("p",null,Object(r.b)("inlineCode",{parentName:"p"},"static defaultPersistedState = {myValue: 55};")),Object(r.b)("h3",{id:"setpersistedstate"},"setPersistedState"),Object(r.b)("p",null,"A callback for updating persisted state. Similar to React's ",Object(r.b)("inlineCode",{parentName:"p"},"setState"),", you can pass either a complete PersistedState or a partial one that will be merged with the current persisted state."),Object(r.b)("p",null,"Persisted state can also be modified when a plugin is not active. See ",Object(r.b)("a",Object(i.a)({parentName:"p"},{href:"#background-plugins"}),"Background Plugins")," for details."),Object(r.b)("h3",{id:"selectplugin"},"selectPlugin"),Object(r.b)("p",null,"A callback for deep-linking to another plugin. When called, Flipper will switch from the current active plugin to the one specified and include a payload to provide context for the receiving plugin."),Object(r.b)("h3",{id:"deeplinkpayload"},"deepLinkPayload"),Object(r.b)("p",null,"When a plugin is activated through a deep-link, this prop will contain the payload, allowing the plugin to highlight some particular data, or perform an action for example. A good time to check for the deepLinkPayload is in the ",Object(r.b)("inlineCode",{parentName:"p"},"componentDidMount")," React callback."),Object(r.b)("h3",{id:"isarchiveddevice"},"isArchivedDevice"),Object(r.b)("p",null,"Informs the plugin whether or not the client is archived, and therefore not currently connected."),Object(r.b)("h2",{id:"background-plugins"},"Background Plugins"),Object(r.b)("p",null,"Sometimes it's desirable for a plugin to be able to process incoming messages from the client even when inactive."),Object(r.b)("p",null,"To do this, define a static ",Object(r.b)("inlineCode",{parentName:"p"},"persistedStateReducer")," function in the plugin class:"),Object(r.b)("pre",null,Object(r.b)("code",Object(i.a)({parentName:"pre"},{className:"language-typescript"}),"static persistedStateReducer<PersistedState>(\n    persistedState: PersistedState,\n    method: string,\n    data: Object\n  ): PersistedState\n")),Object(r.b)("p",null,"The job of the ",Object(r.b)("inlineCode",{parentName:"p"},"persistedStateReducer")," is to merge incoming data into the state, so that next time the plugin is activated, the persisted state will be ready.\nIf a plugin has a ",Object(r.b)("inlineCode",{parentName:"p"},"persistedStateReducer"),", and the plugin is not open in flipper, incoming messages are queued until the plugin is opened."),Object(r.b)("p",null,"The number of events that are cached for a plugin is controlled by the optional static field ",Object(r.b)("inlineCode",{parentName:"p"},"maxQueueSize"),", which defaults to ",Object(r.b)("inlineCode",{parentName:"p"},"10000")," events."),Object(r.b)("div",{class:"warning"},Object(r.b)("p",null,"Note that if a plugin is not starred by the user, it will not receive any messages when it is not selected by the user. Even when it has a ",Object(r.b)("inlineCode",{parentName:"p"},"persistedStateReducer"),". This prevents plugins that are not actively used by the user from wasting a lot of CPU / memory.")),Object(r.b)("p",null,"The data that is produced from ",Object(r.b)("inlineCode",{parentName:"p"},"persistedStateReducer")," should be immutable, but also structurally sharing unchanged parts of the state with the previous state to avoid performance hiccups. To simplify this process we recommend using the ",Object(r.b)("a",Object(i.a)({parentName:"p"},{href:"https://immerjs.github.io/immer/docs/introduction"}),"Immer"),' package.\nImmer makes it possible to keep the reducer concise by directly supporting "writing" to the current state, and keeping track of that in the background.\nAlso it will guarantee that there are no accidental data manipulations by freezing the produced state.'),Object(r.b)("p",null,"You can directly ",Object(r.b)("inlineCode",{parentName:"p"},'import {produce} from "flipper"')," so there is no need to add Immer as additional dependency."),Object(r.b)("p",null,"A quick example:"),Object(r.b)("pre",null,Object(r.b)("code",Object(i.a)({parentName:"pre"},{className:"language-typescript"}),'static persistedStateReducer(persistedState, method, data) {\n  return produce(persistedState, draft => {\n    if (method.name === "newRecord") {\n      draft.lastRecordReceived = Date.now();\n      draft.records.push(data);\n    }\n  });\n}\n')),Object(r.b)("h2",{id:"notifications"},"Notifications"),Object(r.b)("p",null,"Plugins can publish system notifications to alert the user of something. This is particularly useful when the plugin isn't the current active plugin. All notifications are aggregated in Flipper's notifications pane, accessible from the sidebar."),Object(r.b)("p",null,"A notification should provide actionable and high-signal information for important events the user is likely to take action on. Notifications are generated from the data in your persistedState. To trigger notifications you need to implement a static function ",Object(r.b)("inlineCode",{parentName:"p"},"getActiveNotifications"),". This function should return all currently active notifications. To invalidate a notification, you simply stop including it in the result."),Object(r.b)("pre",null,Object(r.b)("code",Object(i.a)({parentName:"pre"},{}),"static getActiveNotifications(\n    persistedState: PersistedState\n  ): Array<Notification>\n")),Object(r.b)("p",null,"When the user clicks on a notification, they will be sent back to your plugin with the ",Object(r.b)("a",Object(i.a)({parentName:"p"},{href:"#deeplinkpayload"}),"deepLinkPayload")," equal to the notification's action."),Object(r.b)("h2",{id:"type-parameters"},"Type Parameters"),Object(r.b)("p",null,Object(r.b)("inlineCode",{parentName:"p"},"FlipperPlugin<S, A, P>")," can optionally take the following type parameters. It is highly recommended you provide them to benefit from type safety, but you can pass ",Object(r.b)("inlineCode",{parentName:"p"},"any")," when not using these features."),Object(r.b)("p",null,Object(r.b)("strong",{parentName:"p"},"State"),": Specifies the type of the FlipperPlugin state. A ",Object(r.b)("inlineCode",{parentName:"p"},"FlipperPlugin")," is a React component, and this is equivalent to the React state type parameter."),Object(r.b)("p",null,Object(r.b)("strong",{parentName:"p"},"Actions"),": ",Object(r.b)("inlineCode",{parentName:"p"},"FlipperPlugin")," has an infrequently used dispatchAction mechanism allowing your plugin dispatch actions and reduce state in a redux-like manner. This specifies the type of actions that can be dispatched."),Object(r.b)("p",null,Object(r.b)("strong",{parentName:"p"},"PersistedState"),": This specifies the type of the persisted state of the plugin."))}c.isMDXComponent=!0},138:function(e,t,n){"use strict";n.d(t,"a",(function(){return d})),n.d(t,"b",(function(){return h}));var i=n(0),a=n.n(i);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function l(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);t&&(i=i.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,i)}return n}function s(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?l(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):l(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,i,a=function(e,t){if(null==e)return{};var n,i,a={},r=Object.keys(e);for(i=0;i<r.length;i++)n=r[i],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);for(i=0;i<r.length;i++)n=r[i],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var p=a.a.createContext({}),c=function(e){var t=a.a.useContext(p),n=t;return e&&(n="function"==typeof e?e(t):s(s({},t),e)),n},d=function(e){var t=c(e.components);return a.a.createElement(p.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return a.a.createElement(a.a.Fragment,{},t)}},b=a.a.forwardRef((function(e,t){var n=e.components,i=e.mdxType,r=e.originalType,l=e.parentName,p=o(e,["components","mdxType","originalType","parentName"]),d=c(n),b=i,h=d["".concat(l,".").concat(b)]||d[b]||u[b]||r;return n?a.a.createElement(h,s(s({ref:t},p),{},{components:n})):a.a.createElement(h,s({ref:t},p))}));function h(e,t){var n=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var r=n.length,l=new Array(r);l[0]=b;var s={};for(var o in t)hasOwnProperty.call(t,o)&&(s[o]=t[o]);s.originalType=e,s.mdxType="string"==typeof e?e:i,l[1]=s;for(var p=2;p<r;p++)l[p]=n[p];return a.a.createElement.apply(null,l)}return a.a.createElement.apply(null,n)}b.displayName="MDXCreateElement"}}]);