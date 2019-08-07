/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  ElementID,
  Element,
  PluginClient,
  ElementSearchResultSet,
} from 'flipper';
import {ElementsInspector} from 'flipper';
import {Component} from 'react';
import debounce from 'lodash.debounce';

import type {PersistedState, ElementMap} from './';

type GetNodesOptions = {
  force?: boolean,
  ax?: boolean,
  forAccessibilityEvent?: boolean,
};

type Props = {
  ax?: boolean,
  client: PluginClient,
  showsSidebar: boolean,
  inAlignmentMode?: boolean,
  selectedElement: ?ElementID,
  selectedAXElement: ?ElementID,
  onSelect: (ids: ?ElementID) => void,
  onDataValueChanged: (path: Array<string>, value: any) => void,
  setPersistedState: (state: $Shape<PersistedState>) => void,
  persistedState: PersistedState,
  searchResults: ?ElementSearchResultSet,
};

export default class Inspector extends Component<Props> {
  call() {
    return {
      GET_ROOT: this.props.ax ? 'getAXRoot' : 'getRoot',
      INVALIDATE: this.props.ax ? 'invalidateAX' : 'invalidate',
      GET_NODES: this.props.ax ? 'getAXNodes' : 'getNodes',
      SET_HIGHLIGHTED: 'setHighlighted',
      SELECT: this.props.ax ? 'selectAX' : 'select',
      INVALIDATE_WITH_DATA: this.props.ax
        ? 'invalidateWithDataAX'
        : 'invalidateWithData',
    };
  }

  selected = () => {
    return this.props.ax
      ? this.props.selectedAXElement
      : this.props.selectedElement;
  };

  root = () => {
    return this.props.ax
      ? this.props.persistedState.rootAXElement
      : this.props.persistedState.rootElement;
  };

  elements = () => {
    return this.props.ax
      ? this.props.persistedState.AXelements
      : this.props.persistedState.elements;
  };

  focused = () => {
    if (!this.props.ax) {
      return null;
    }
    // $FlowFixMe: Object.values returns Array<mixed>
    const elements: Array<Element> = Object.values(
      this.props.persistedState.AXelements,
    );
    return elements.find(i => i?.data?.Accessibility?.['accessibility-focused'])
      ?.id;
  };

  getAXContextMenuExtensions = () =>
    this.props.ax
      ? [
          {
            label: 'Focus',
            click: (id: ElementID) => {
              this.props.client.call('onRequestAXFocus', {id});
            },
          },
        ]
      : [];

  componentDidMount() {
    this.props.client.call(this.call().GET_ROOT).then((root: Element) => {
      this.props.setPersistedState({
        [this.props.ax ? 'rootAXElement' : 'rootElement']: root.id,
      });
      this.updateElement(root.id, {...root, expanded: true});
      this.performInitialExpand(root);
    });

    this.props.client.subscribe(
      this.call().INVALIDATE,
      ({
        nodes,
      }: {
        nodes: Array<{id: ElementID, children: Array<ElementID>}>,
      }) => {
        const ids = nodes
          .map(n => [n.id, ...(n.children || [])])
          .reduce((acc, cv) => acc.concat(cv), []);
        this.invalidate(ids);
      },
    );

    this.props.client.subscribe(
      this.call().INVALIDATE_WITH_DATA,
      (obj: {nodes: Array<Element>}) => {
        const {nodes} = obj;
        this.invalidateWithData(nodes);
      },
    );

    this.props.client.subscribe(
      this.call().SELECT,
      ({path}: {path: Array<ElementID>}) => {
        this.getAndExpandPath(path);
      },
    );

    if (this.props.ax) {
      this.props.client.subscribe('axFocusEvent', () => {
        // update all nodes, to find new focused node
        this.getNodes(Object.keys(this.props.persistedState.AXelements), {
          force: true,
          ax: true,
        });
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    const {ax, selectedElement, selectedAXElement} = this.props;

    if (
      ax &&
      selectedElement &&
      selectedElement !== prevProps.selectedElement
    ) {
      // selected element in non-AX tree changed, find linked element in AX tree
      const newlySelectedElem = this.props.persistedState.elements[
        selectedElement
      ];
      if (newlySelectedElem) {
        this.props.onSelect(newlySelectedElem.extraInfo?.linkedNode);
      }
    } else if (
      !ax &&
      selectedAXElement &&
      selectedAXElement !== prevProps.selectedAXElement
    ) {
      // selected element in AX tree changed, find linked element in non-AX tree
      const newlySelectedAXElem = this.props.persistedState.AXelements[
        selectedAXElement
      ];
      if (newlySelectedAXElem) {
        this.props.onSelect(newlySelectedAXElem.extraInfo?.linkedNode);
      }
    }
  }

  invalidateWithData(elements: Array<Element>): void {
    if (elements.length === 0) {
      return;
    }
    const updatedElements: ElementMap = elements.reduce(
      (acc: ElementMap, element: Element) => {
        acc[element.id] = {
          ...element,
          expanded: this.elements()[element.id]?.expanded,
        };
        return acc;
      },
      new Map(),
    );
    this.props.setPersistedState({
      [this.props.ax ? 'AXelements' : 'elements']: {
        ...this.elements(),
        ...updatedElements,
      },
    });
  }

  invalidate(ids: Array<ElementID>): Promise<Array<Element>> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.getNodes(ids, {}).then((elements: Array<Element>) => {
      const children = elements
        .filter((element: Element) => this.elements()[element.id]?.expanded)
        .map((element: Element) => element.children)
        .reduce((acc, val) => acc.concat(val), []);
      return this.invalidate(children);
    });
  }

  updateElement(id: ElementID, data: Object) {
    this.props.setPersistedState({
      [this.props.ax ? 'AXelements' : 'elements']: {
        ...this.elements(),
        [id]: {
          ...this.elements()[id],
          ...data,
        },
      },
    });
  }

  // When opening the inspector for the first time, expand all elements that
  // contain only 1 child recursively.
  async performInitialExpand(element: Element): Promise<void> {
    if (!element.children.length) {
      // element has no children so we're as deep as we can be
      return;
    }
    return this.getChildren(element.id, {}).then((elements: Array<Element>) => {
      if (element.children.length >= 2) {
        // element has two or more children so we can stop expanding
        return;
      }
      return this.performInitialExpand(this.elements()[element.children[0]]);
    });
  }

  async getChildren(
    id: ElementID,
    options: GetNodesOptions,
  ): Promise<Array<Element>> {
    if (!this.elements()[id]) {
      await this.getNodes([id], options);
    }
    this.updateElement(id, {expanded: true});
    return this.getNodes(this.elements()[id].children, options);
  }

  getNodes(
    ids: Array<ElementID> = [],
    options: GetNodesOptions,
  ): Promise<Array<Element>> {
    const {forAccessibilityEvent} = options;

    if (ids.length > 0) {
      return this.props.client
        .call(this.call().GET_NODES, {
          ids,
          forAccessibilityEvent,
          selected: false,
        })
        .then(({elements}) => {
          elements.forEach(e => this.updateElement(e.id, e));
          return elements;
        });
    } else {
      return Promise.resolve([]);
    }
  }

  getAndExpandPath(path: Array<ElementID>) {
    return Promise.all(path.map(id => this.getChildren(id, {}))).then(() => {
      this.onElementSelected(path[path.length - 1]);
    });
  }

  onElementSelected = debounce((selectedKey: ElementID) => {
    this.onElementHovered(selectedKey);
    this.props.onSelect(selectedKey);
  });

  onElementHovered = debounce((key: ?ElementID) =>
    this.props.client.call(this.call().SET_HIGHLIGHTED, {
      id: key,
      isAlignmentMode: this.props.inAlignmentMode,
    }),
  );

  onElementExpanded = (id: ElementID, deep: boolean) => {
    const expanded = !this.elements()[id].expanded;
    this.updateElement(id, {expanded});
    if (expanded) {
      this.getChildren(id, {}).then(children => {
        if (deep) {
          children.forEach(child => this.onElementExpanded(child.id, deep));
        }
      });
    }
  };

  render() {
    return this.root() ? (
      <ElementsInspector
        onElementSelected={this.onElementSelected}
        onElementHovered={this.onElementHovered}
        onElementExpanded={this.onElementExpanded}
        onValueChanged={this.props.onDataValueChanged}
        searchResults={this.props.searchResults}
        selected={this.selected()}
        root={this.root()}
        elements={this.elements()}
        focused={this.focused()}
        contextMenuExtensions={this.getAXContextMenuExtensions()}
      />
    ) : null;
  }
}
