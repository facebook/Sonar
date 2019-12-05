/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  Text,
  FlexColumn,
  styled,
  FlexRow,
  Button,
  Spacer,
  Checkbox,
  colors,
  View,
} from '../ui';
import React, {Component} from 'react';

export type SelectionType = 'multiple' | 'single';

type SubType =
  | {
      selectedElements: Set<string>;
      type: 'multiple';
    }
  | {
      selectedElement: string;
      type: 'single';
    };

type Props = {
  onSelect: (elements: Array<string>) => void;
  onHide: () => any;
  elements: Array<string>;
  title?: string;
  showNavButtons: boolean;
} & SubType;

const Title = styled(Text)({
  margin: 6,
});

type State = {
  selectedElements: Set<string>;
};

const Container = styled(FlexColumn)({
  padding: 8,
});

const Line = styled(View)({
  backgroundColor: colors.greyTint2,
  height: 1,
  width: 'auto',
  flexShrink: 0,
});

const RowComponentContainer = styled(FlexColumn)({
  overflow: 'scroll',
  height: 'auto',
  backgroundColor: colors.white,
  maxHeight: 500,
});

const Padder = styled('div')(
  ({
    paddingLeft,
    paddingRight,
    paddingBottom,
    paddingTop,
  }: {
    paddingLeft?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingTop?: number;
  }) => ({
    paddingLeft: paddingLeft || 0,
    paddingRight: paddingRight || 0,
    paddingBottom: paddingBottom || 0,
    paddingTop: paddingTop || 0,
  }),
);

type RowComponentProps = {
  name: string;
  selected: boolean;
  onChange: (name: string, selected: boolean) => void;
};

class RowComponent extends Component<RowComponentProps> {
  render() {
    const {name, selected, onChange} = this.props;
    return (
      <FlexColumn>
        <Padder
          paddingRight={8}
          paddingTop={8}
          paddingBottom={8}
          paddingLeft={8}>
          <FlexRow>
            <Text> {name} </Text>
            <Spacer />
            <Checkbox
              checked={selected}
              onChange={selected => {
                onChange(name, selected);
              }}
            />
          </FlexRow>
        </Padder>
        <Line />
      </FlexColumn>
    );
  }
}

export default class ListView extends Component<Props, State> {
  state: State = {selectedElements: new Set([])};
  static getDerivedStateFromProps(props: Props, state: State) {
    if (state.selectedElements.size > 0) {
      return null;
    }
    if (props.type === 'multiple') {
      return {selectedElements: props.selectedElements};
    } else if (props.type === 'single') {
      return {selectedElements: new Set([props.selectedElement])};
    }

    return null;
  }

  handleChange = (id: string, selected: boolean) => {
    let selectedElements: Set<string> = new Set([]);
    if (this.props.type === 'single') {
      if (!selected) {
        this.setState({selectedElements: selectedElements});
      } else {
        selectedElements.add(id);
        this.setState({selectedElements: selectedElements});
      }
    } else {
      if (selected) {
        selectedElements = new Set([...this.state.selectedElements, id]);
        this.setState({
          selectedElements: selectedElements,
        });
      } else {
        selectedElements = new Set([...this.state.selectedElements]);
        selectedElements.delete(id);
        this.setState({selectedElements});
      }
    }
    if (!this.props.showNavButtons) {
      this.props.onSelect([...selectedElements]);
    }
  };

  render() {
    return (
      <Container>
        <FlexColumn>
          {this.props.title && <Title>{this.props.title}</Title>}
          <RowComponentContainer>
            {this.props.elements.map(id => {
              return (
                <RowComponent
                  name={id}
                  key={id}
                  selected={this.state.selectedElements.has(id)}
                  onChange={this.handleChange}
                />
              );
            })}
          </RowComponentContainer>
        </FlexColumn>
        {this.props.showNavButtons && (
          <Padder paddingTop={8} paddingBottom={2}>
            <FlexRow>
              <Spacer />
              <Button compact padded onClick={this.props.onHide}>
                Close
              </Button>
              <Button
                compact
                padded
                type="primary"
                onClick={() => {
                  this.props.onSelect([...this.state.selectedElements]);
                }}>
                Submit
              </Button>
            </FlexRow>
          </Padder>
        )}
      </Container>
    );
  }
}
