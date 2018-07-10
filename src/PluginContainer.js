/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type {SonarPlugin, SonarBasePlugin} from './plugin.js';
import type LogManager from './fb-stubs/Logger';
import type Client from './Client.js';
import type BaseDevice from './devices/BaseDevice.js';

import {SonarDevicePlugin} from './plugin.js';
import {ErrorBoundary, Component, FlexColumn, FlexRow, colors} from 'sonar';
import React from 'react';
import {connect} from 'react-redux';
import {setPluginState} from './reducers/pluginStates.js';
import {devicePlugins} from './device-plugins/index.js';
import plugins from './plugins/index.js';
import {activateMenuItems} from './MenuBar.js';

const Container = FlexColumn.extends({
  width: 0,
  flexGrow: 1,
  flexShrink: 1,
  backgroundColor: colors.white,
});

const SidebarContainer = FlexRow.extends({
  backgroundColor: colors.light02,
  height: '100%',
  overflow: 'scroll',
});

type Props = {
  logger: LogManager,
  selectedDevice: BaseDevice,
  selectedPlugin: ?string,
  selectedApp: ?string,
  pluginStates: Object,
  clients: Array<Client>,
  setPluginState: (payload: {
    pluginKey: string,
    state: Object,
  }) => void,
};

type State = {
  activePlugin: ?Class<SonarBasePlugin<>>,
  target: Client | BaseDevice | null,
  pluginKey: string,
};

function computeState(props: Props): State {
  // plugin changed
  let activePlugin = devicePlugins.find(
    (p: Class<SonarDevicePlugin<>>) => p.id === props.selectedPlugin,
  );
  let target = props.selectedDevice;
  let pluginKey = 'unknown';
  if (activePlugin) {
    pluginKey = `${props.selectedDevice.serial}#${activePlugin.id}`;
  } else {
    target = props.clients.find(
      (client: Client) => client.id === props.selectedApp,
    );
    activePlugin = plugins.find(
      (p: Class<SonarPlugin<>>) => p.id === props.selectedPlugin,
    );
    if (!activePlugin || !target) {
      throw new Error(
        `Plugin "${props.selectedPlugin || ''}" could not be found.`,
      );
    }
    pluginKey = `${target.id}#${activePlugin.id}`;
  }

  return {
    activePlugin,
    target,
    pluginKey,
  };
}

class PluginContainer extends Component<Props, State> {
  plugin: ?SonarBasePlugin<>;

  constructor(props: Props) {
    super();
    this.state = computeState(props);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      nextProps.selectedDevice !== this.props.selectedDevice ||
      nextProps.selectedApp !== this.props.selectedApp ||
      nextProps.selectedPlugin !== this.props.selectedPlugin
    ) {
      this.setState(computeState(nextProps));
    }
  }

  refChanged = (ref: ?SonarBasePlugin<>) => {
    if (this.plugin) {
      this.plugin._teardown();
      this.plugin = null;
    }
    const {target} = this.state;
    if (ref && target) {
      activateMenuItems(ref);
      ref._setup(target);
      ref._init();
      this.plugin = ref;
    }
  };

  render() {
    const {pluginStates, setPluginState} = this.props;
    const {activePlugin, pluginKey, target} = this.state;

    if (!activePlugin || !target) {
      return null;
    }

    return (
      // $FlowFixMe: Flow doesn't know of React.Fragment yet
      <React.Fragment>
        <Container key="plugin">
          <ErrorBoundary
            heading={`Plugin "${
              activePlugin.title
            }" encountered an error during render`}
            logger={this.props.logger}>
            {React.createElement(activePlugin, {
              key: pluginKey,
              logger: this.props.logger,
              persistedState: pluginStates[pluginKey] || {},
              setPersistedState: state => setPluginState({pluginKey, state}),
              ref: this.refChanged,
            })}
          </ErrorBoundary>
        </Container>
        <SidebarContainer id="sonarSidebar" />
      </React.Fragment>
    );
  }
}

export default connect(
  ({
    application: {rightSidebarVisible, rightSidebarAvailable},
    connections: {selectedPlugin, selectedDevice, selectedApp},
    pluginStates,
    server: {clients},
  }) => ({
    selectedPlugin,
    selectedDevice,
    pluginStates,
    selectedApp,
    clients,
  }),
  {
    setPluginState,
  },
)(PluginContainer);
