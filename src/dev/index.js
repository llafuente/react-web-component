const ReactDOM = require('react-dom');
const retargetEvents = require('react-shadow-dom-retarget-events');
const getStyleElementsFromReactWebComponentStyleLoader = require('./getStyleElementsFromReactWebComponentStyleLoader');
const extractAttributes = require('./extractAttributes');

module.exports = {
  /**
   * @param {JSX.Element} app
   * @param {string} tagName - The name of the web component. Has to be minus "-" delimited.
   * @param {boolean} useShadowDom - If the value is set to "true" the web component will use the `shadowDom`. The default value is true.
   */
  create: (app, tagName, useShadowDom = true) => {
    let appInstance;

    const lifeCycleHooks = {
      connectedCallback: 'webComponentConnected',
      disconnectedCallback: 'webComponentDisconnected',
      attributeChangedCallback: 'webComponentAttributeChanged',
      adoptedCallback: 'webComponentAdopted'
    };

    function callConstructorHook(webComponentInstance) {
      if (appInstance['webComponentConstructed']) {
        appInstance['webComponentConstructed'].apply(appInstance, [webComponentInstance])
      }
    }

    function callLifeCycleHook(hook, params) {
      const instanceParams = params || [];
      const instanceMethod = lifeCycleHooks[hook];

      if (instanceMethod && appInstance && appInstance[instanceMethod]) {
        appInstance[instanceMethod].apply(appInstance, instanceParams);
      }
    }

    const proto = class extends HTMLElement {
      connectedCallback() {
        let webComponentInstance = this;
        let mountPoint = webComponentInstance;

        if (useShadowDom) {
          // Re-assign the mountPoint to the newly created "div" element
          mountPoint = document.createElement('div');

          const shadowRoot = this.attachShadow({ mode: 'open' });
          const styles = getStyleElementsFromReactWebComponentStyleLoader();
          for (var i = 0; i < styles.length; i++) {
            shadowRoot.appendChild(styles[i].cloneNode(true));
          }
          shadowRoot.appendChild(mountPoint);

          retargetEvents(webComponentInstance);
        }

        ReactDOM.render(app, mountPoint, function () {
          appInstance = this;

          // Assign web components attributes to component state
          const obj = extractAttributes(webComponentInstance);
          for (let k in obj) {
            appInstance.state[k] = obj[k];
          }

          callConstructorHook(webComponentInstance);
          //callLifeCycleHook('attachedCallback');
          callLifeCycleHook('connectedCallback');
        });
      }

      disconnectedCallback() {
        callLifeCycleHook('disconnectedCallback');
      }

      attributeChangedCallback(attributeName, oldValue, newValue, namespace) {
        callLifeCycleHook('attributeChangedCallback', [attributeName, oldValue, newValue, namespace]);
      }

      adoptedCallback(oldDocument, newDocument) {
        callLifeCycleHook('adoptedCallback', [oldDocument, newDocument]);
      }
    };

    customElements.define(tagName, proto);
  },
};
