/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexColumn, Button, styled, Layout} from 'flipper';

import {ManageMockResponsePanel} from './ManageMockResponsePanel';
import {Route, Request, Response} from './types';
import React from 'react';

type Props = {
  routes: {[id: string]: Route};
  onHide: () => void;
  highlightedRows: Set<string> | null | undefined;
  requests: {[id: string]: Request};
  responses: {[id: string]: Response};
};

const Title = styled('div')({
  fontWeight: 500,
  marginBottom: 10,
  marginTop: 8,
});

const Container = styled(FlexColumn)({
  padding: 10,
  width: 800,
  height: 550,
});

const Row = styled(FlexColumn)({
  alignItems: 'flex-end',
  marginTop: 16,
});

export function MockResponseDialog(props: Props) {
  return (
    <Layout.Container pad width={1200}>
      <Title>Mock Network Responses</Title>
      <Layout.Horizontal>
        <ManageMockResponsePanel
          routes={props.routes}
          highlightedRows={props.highlightedRows}
          requests={props.requests}
          responses={props.responses}
        />
      </Layout.Horizontal>
      <Layout.Horizontal>
        <Button compact padded onClick={props.onHide}>
          Close
        </Button>
      </Layout.Horizontal>
    </Layout.Container>
  );
}
