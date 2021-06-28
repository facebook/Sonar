/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Component} from 'react';
import querystring from 'querystring';
import xmlBeautifier from 'xml-beautifier';
import {Base64} from 'js-base64';

import {
  DataInspector,
  Layout,
  Panel,
  styled,
  theme,
  CodeBlock,
} from 'flipper-plugin';
import {Select, Typography} from 'antd';

import {bodyAsBinary, bodyAsString, formatBytes, getHeaderValue} from './utils';
import {Request, Header, Insights, RetryInsights} from './types';
import {BodyOptions} from './index';
import {ProtobufDefinitionsRepository} from './ProtobufDefinitionsRepository';
import {KeyValueItem, KeyValueTable} from './KeyValueTable';
import {CopyOutlined} from '@ant-design/icons';

const {Text} = Typography;

type RequestDetailsProps = {
  request: Request;
  bodyFormat: string;
  onSelectFormat: (bodyFormat: string) => void;
  onCopyText(test: string): void;
};
export default class RequestDetails extends Component<RequestDetailsProps> {
  urlColumns = (url: URL) => {
    return [
      {
        key: 'Full URL',
        value: url.href,
      },
      {
        key: 'Host',
        value: url.host,
      },
      {
        key: 'Path',
        value: url.pathname,
      },
      {
        key: 'Query String',
        value: url.search,
      },
    ];
  };

  render() {
    const {request, bodyFormat, onSelectFormat, onCopyText} = this.props;
    const url = new URL(request.url);

    const formattedText = bodyFormat == 'formatted';

    return (
      <>
        <Panel key="request" title={'Request'}>
          <KeyValueTable items={this.urlColumns(url)} />
        </Panel>

        {url.search ? (
          <Panel title={'Request Query Parameters'}>
            <QueryInspector queryParams={url.searchParams} />
          </Panel>
        ) : null}

        {request.requestHeaders.length > 0 ? (
          <Panel key="headers" title={'Request Headers'}>
            <HeaderInspector headers={request.requestHeaders} />
          </Panel>
        ) : null}

        {request.requestData != null ? (
          <Panel
            key="requestData"
            title={'Request Body'}
            extraActions={
              typeof request.requestData === 'string' ? (
                <CopyOutlined
                  title="Copy request body"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyText(request.requestData as string);
                  }}
                />
              ) : null
            }
            pad>
            <RequestBodyInspector
              formattedText={formattedText}
              request={request}
            />
          </Panel>
        ) : null}
        {request.status ? (
          <>
            {request.responseHeaders?.length ? (
              <Panel
                key={'responseheaders'}
                title={`Response Headers${
                  request.responseIsMock ? ' (Mocked)' : ''
                }`}>
                <HeaderInspector headers={request.responseHeaders} />
              </Panel>
            ) : null}
            <Panel
              key={'responsebody'}
              title={`Response Body${
                request.responseIsMock ? ' (Mocked)' : ''
              }`}
              extraActions={
                typeof request.responseData === 'string' &&
                request.responseData ? (
                  <CopyOutlined
                    title="Copy response body"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyText(request.responseData as string);
                    }}
                  />
                ) : null
              }
              pad>
              <ResponseBodyInspector
                formattedText={formattedText}
                request={request}
              />
            </Panel>
          </>
        ) : null}
        <Panel key="options" title={'Options'} collapsed pad>
          <Text>Body formatting:</Text>
          <Select
            value={bodyFormat}
            onChange={onSelectFormat}
            options={BodyOptions}
          />
        </Panel>
        {request.insights ? (
          <Panel key="insights" title={'Insights'} collapsed>
            <InsightsInspector insights={request.insights} />
          </Panel>
        ) : null}
      </>
    );
  }
}

class QueryInspector extends Component<{queryParams: URLSearchParams}> {
  render() {
    const rows: KeyValueItem[] = [];
    this.props.queryParams.forEach((value: string, key: string) => {
      rows.push({
        key,
        value,
      });
    });
    return rows.length > 0 ? <KeyValueTable items={rows} /> : null;
  }
}

type HeaderInspectorProps = {
  headers: Array<Header>;
};

type HeaderInspectorState = {
  computedHeaders: Object;
};

class HeaderInspector extends Component<
  HeaderInspectorProps,
  HeaderInspectorState
> {
  render() {
    const computedHeaders: Map<string, string> = this.props.headers.reduce(
      (sum, header) => {
        return sum.set(header.key, header.value);
      },
      new Map(),
    );

    const rows = Array.from(computedHeaders.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] == b[0] ? 0 : 1))
      .map(([key, value]) => ({key, value}));
    return rows.length > 0 ? (
      <KeyValueTable items={this.props.headers} />
    ) : null;
  }
}

type BodyFormatter = {
  formatRequest?: (request: Request) => any;
  formatResponse?: (request: Request) => any;
};

class RequestBodyInspector extends Component<{
  request: Request;
  formattedText: boolean;
}> {
  render() {
    const {request, formattedText} = this.props;
    if (request.requestData == null || request.requestData === '') {
      return <Empty />;
    }
    const bodyFormatters = formattedText ? TextBodyFormatters : BodyFormatters;
    for (const formatter of bodyFormatters) {
      if (formatter.formatRequest) {
        try {
          const component = formatter.formatRequest(request);
          if (component) {
            return (
              <Layout.Container gap>
                {component}
                <FormattedBy>
                  Formatted by {formatter.constructor.name}
                </FormattedBy>
              </Layout.Container>
            );
          }
        } catch (e) {
          console.warn(
            'BodyFormatter exception from ' + formatter.constructor.name,
            e.message,
          );
        }
      }
    }
    return renderRawBody(request, 'request');
  }
}

class ResponseBodyInspector extends Component<{
  request: Request;
  formattedText: boolean;
}> {
  render() {
    const {request, formattedText} = this.props;
    if (request.responseData == null || request.responseData === '') {
      return <Empty />;
    }
    const bodyFormatters = formattedText ? TextBodyFormatters : BodyFormatters;
    for (const formatter of bodyFormatters) {
      if (formatter.formatResponse) {
        try {
          const component = formatter.formatResponse(request);
          if (component) {
            return (
              <Layout.Container gap>
                {component}
                <FormattedBy>
                  Formatted by {formatter.constructor.name}
                </FormattedBy>
              </Layout.Container>
            );
          }
        } catch (e) {
          console.warn(
            'BodyFormatter exception from ' + formatter.constructor.name,
            e.message,
          );
        }
      }
    }
    return renderRawBody(request, 'response');
  }
}

const FormattedBy = styled(Text)({
  marginTop: 8,
  fontSize: '0.7em',
  textAlign: 'center',
  display: 'block',
  color: theme.disabledColor,
});

const Empty = () => (
  <Layout.Container pad>
    <Text>(empty)</Text>
  </Layout.Container>
);

function renderRawBody(request: Request, mode: 'request' | 'response') {
  const data = mode === 'request' ? request.requestData : request.responseData;
  return (
    <Layout.Container gap>
      <CodeBlock>{bodyAsString(data)}</CodeBlock>
    </Layout.Container>
  );
}

type ImageWithSizeProps = {
  src: string;
};

type ImageWithSizeState = {
  width: number;
  height: number;
};

class ImageWithSize extends Component<ImageWithSizeProps, ImageWithSizeState> {
  static Image = styled.img({
    objectFit: 'scale-down',
    maxWidth: '100%',
    marginBottom: 10,
  });

  constructor(props: ImageWithSizeProps) {
    super(props);
    this.state = {
      width: 0,
      height: 0,
    };
  }

  componentDidMount() {
    const image = new Image();
    image.src = this.props.src;
    image.onload = () => {
      image.width;
      image.height;
      this.setState({
        width: image.width,
        height: image.height,
      });
    };
  }

  render() {
    return (
      <Layout.Container center>
        <ImageWithSize.Image src={this.props.src} />
        <Text type="secondary">
          {this.state.width} x {this.state.height}
        </Text>
      </Layout.Container>
    );
  }
}

class ImageFormatter {
  formatResponse(request: Request) {
    if (
      getHeaderValue(request.responseHeaders, 'content-type').startsWith(
        'image/',
      )
    ) {
      if (request.responseData) {
        const src = `data:${getHeaderValue(
          request.responseHeaders,
          'content-type',
        )};base64,${Base64.fromUint8Array(
          bodyAsBinary(request.responseData)!,
        )}`;
        return <ImageWithSize src={src} />;
      } else {
        // fallback to using the request url
        return <ImageWithSize src={request.url} />;
      }
    }
  }
}

class VideoFormatter {
  static Video = styled.video({
    maxWidth: 500,
    maxHeight: 500,
  });

  formatResponse = (request: Request) => {
    const contentType = getHeaderValue(request.responseHeaders, 'content-type');
    if (contentType.startsWith('video/')) {
      return (
        <Layout.Container center>
          <VideoFormatter.Video controls>
            <source src={request.url} type={contentType} />
          </VideoFormatter.Video>
        </Layout.Container>
      );
    }
  };
}

class JSONText extends Component<{children: any}> {
  render() {
    const jsonObject = this.props.children;
    return (
      <CodeBlock>
        {JSON.stringify(jsonObject, null, 2)}
        {'\n'}
      </CodeBlock>
    );
  }
}

class XMLText extends Component<{body: any}> {
  render() {
    const xmlPretty = xmlBeautifier(this.props.body);
    return (
      <CodeBlock>
        {xmlPretty}
        {'\n'}
      </CodeBlock>
    );
  }
}

class JSONTextFormatter {
  formatRequest(request: Request) {
    return this.format(
      bodyAsString(request.requestData),
      getHeaderValue(request.requestHeaders, 'content-type'),
    );
  }

  formatResponse(request: Request) {
    return this.format(
      bodyAsString(request.responseData),
      getHeaderValue(request.responseHeaders, 'content-type'),
    );
  }

  format(body: string, contentType: string) {
    if (
      contentType.startsWith('application/json') ||
      contentType.startsWith('application/hal+json') ||
      contentType.startsWith('text/javascript') ||
      contentType.startsWith('application/x-fb-flatbuffer')
    ) {
      try {
        const data = JSON.parse(body);
        return <JSONText>{data}</JSONText>;
      } catch (SyntaxError) {
        // Multiple top level JSON roots, map them one by one
        return body
          .split('\n')
          .map((json) => JSON.parse(json))
          .map((data, idx) => <JSONText key={idx}>{data}</JSONText>);
      }
    }
  }
}

class XMLTextFormatter {
  formatRequest(request: Request) {
    return this.format(
      bodyAsString(request.requestData),
      getHeaderValue(request.requestHeaders, 'content-type'),
    );
  }

  formatResponse(request: Request) {
    return this.format(
      bodyAsString(request.responseData),
      getHeaderValue(request.responseHeaders, 'content-type'),
    );
  }

  format(body: string, contentType: string) {
    if (contentType.startsWith('text/html')) {
      return <XMLText body={body} />;
    }
  }
}

class JSONFormatter {
  formatRequest(request: Request) {
    return this.format(
      bodyAsString(request.requestData),
      getHeaderValue(request.requestHeaders, 'content-type'),
    );
  }

  formatResponse(request: Request) {
    return this.format(
      bodyAsString(request.responseData),
      getHeaderValue(request.responseHeaders, 'content-type'),
    );
  }

  format(body: string, contentType: string) {
    if (
      contentType.startsWith('application/json') ||
      contentType.startsWith('application/hal+json') ||
      contentType.startsWith('text/javascript') ||
      contentType.startsWith('application/x-fb-flatbuffer')
    ) {
      try {
        const data = JSON.parse(body);
        return <DataInspector collapsed expandRoot data={data} />;
      } catch (SyntaxError) {
        // Multiple top level JSON roots, map them one by one
        const roots = body.split('\n');
        return (
          <DataInspector
            collapsed
            expandRoot
            data={roots.map((json) => JSON.parse(json))}
          />
        );
      }
    }
  }
}

class LogEventFormatter {
  formatRequest(request: Request) {
    if (request.url.indexOf('logging_client_event') > 0) {
      const data = querystring.parse(bodyAsString(request.requestData));
      if (typeof data.message === 'string') {
        data.message = JSON.parse(data.message);
      }
      return <DataInspector expandRoot data={data} />;
    }
  }
}

class GraphQLBatchFormatter {
  formatRequest(request: Request) {
    if (request.url.indexOf('graphqlbatch') > 0) {
      const data = querystring.parse(bodyAsString(request.requestData));
      if (typeof data.queries === 'string') {
        data.queries = JSON.parse(data.queries);
      }
      return <DataInspector expandRoot data={data} />;
    }
  }
}

class GraphQLFormatter {
  parsedServerTimeForFirstFlush(data: any) {
    const firstResponse =
      Array.isArray(data) && data.length > 0 ? data[0] : data;
    if (!firstResponse) {
      return null;
    }

    const extensions = firstResponse['extensions'];
    if (!extensions) {
      return null;
    }
    const serverMetadata = extensions['server_metadata'];
    if (!serverMetadata) {
      return null;
    }
    const requestStartMs = serverMetadata['request_start_time_ms'];
    const timeAtFlushMs = serverMetadata['time_at_flush_ms'];
    return (
      <Text type="secondary">
        {'Server wall time for initial response (ms): ' +
          (timeAtFlushMs - requestStartMs)}
      </Text>
    );
  }
  formatRequest(request: Request) {
    if (request.url.indexOf('graphql') > 0) {
      const decoded = request.requestData;
      if (!decoded) {
        return undefined;
      }
      const data = querystring.parse(bodyAsString(decoded));
      if (typeof data.variables === 'string') {
        data.variables = JSON.parse(data.variables);
      }
      if (typeof data.query_params === 'string') {
        data.query_params = JSON.parse(data.query_params);
      }
      return <DataInspector expandRoot data={data} />;
    }
  }

  formatResponse(request: Request) {
    return this.format(
      bodyAsString(request.responseData!),
      getHeaderValue(request.responseHeaders, 'content-type'),
    );
  }

  format = (body: string, contentType: string) => {
    if (
      contentType.startsWith('application/json') ||
      contentType.startsWith('application/hal+json') ||
      contentType.startsWith('text/javascript') ||
      contentType.startsWith('text/html') ||
      contentType.startsWith('application/x-fb-flatbuffer')
    ) {
      try {
        const data = JSON.parse(body);
        return (
          <div>
            {this.parsedServerTimeForFirstFlush(data)}
            <DataInspector collapsed expandRoot data={data} />
          </div>
        );
      } catch (SyntaxError) {
        // Multiple top level JSON roots, map them one by one
        const parsedResponses = body
          .replace(/}{/g, '}\r\n{')
          .split('\n')
          .map((json) => JSON.parse(json));
        return (
          <div>
            {this.parsedServerTimeForFirstFlush(parsedResponses)}
            <DataInspector collapsed expandRoot data={parsedResponses} />
          </div>
        );
      }
    }
  };
}

class FormUrlencodedFormatter {
  formatRequest = (request: Request) => {
    const contentType = getHeaderValue(request.requestHeaders, 'content-type');
    if (contentType.startsWith('application/x-www-form-urlencoded')) {
      const decoded = request.requestData;
      if (!decoded) {
        return undefined;
      }
      return (
        <DataInspector
          expandRoot
          data={querystring.parse(bodyAsString(decoded))}
        />
      );
    }
  };
}

class BinaryFormatter {
  formatRequest(request: Request) {
    if (
      getHeaderValue(request.requestHeaders, 'content-type') ===
      'application/octet-stream'
    ) {
      return '(binary data)'; // we could offer a download button here?
    }
    return undefined;
  }

  formatResponse(request: Request) {
    if (
      getHeaderValue(request.responseHeaders, 'content-type') ===
      'application/octet-stream'
    ) {
      return '(binary data)'; // we could offer a download button here?
    }
    return undefined;
  }
}

class ProtobufFormatter {
  private protobufDefinitionRepository =
    ProtobufDefinitionsRepository.getInstance();

  formatRequest(request: Request) {
    if (
      getHeaderValue(request.requestHeaders, 'content-type') ===
        'application/x-protobuf' ||
      this.protobufDefinitionRepository.hasDefinition(
        request.method,
        request.url,
      )
    ) {
      const protobufDefinition =
        this.protobufDefinitionRepository.getRequestType(
          request.method,
          request.url,
        );
      if (protobufDefinition == undefined) {
        return (
          <Text>
            Could not locate protobuf definition for request body of{' '}
            {request.url} <br />
            Please send ProtobufJS definitions with the plugin's
            addProtobufDefinitions method.
          </Text>
        );
      }

      if (request.requestData) {
        const data = protobufDefinition.decode(
          bodyAsBinary(request.requestData)!,
        );
        return <JSONText>{data.toJSON()}</JSONText>;
      } else {
        return (
          <Text>Could not locate request body data for {request.url}</Text>
        );
      }
    }
    return undefined;
  }

  formatResponse(request: Request) {
    if (
      getHeaderValue(request.responseHeaders, 'content-type') ===
        'application/x-protobuf' ||
      request.url.endsWith('.proto') ||
      this.protobufDefinitionRepository.hasDefinition(
        request.method,
        request.url,
      )
    ) {
      const protobufDefinition =
        this.protobufDefinitionRepository.getResponseType(
          request.method,
          request.url,
        );
      if (protobufDefinition == undefined) {
        return (
          <Text>
            Could not locate protobuf definition for response body of{' '}
            {request.url} <br />
            Please send ProtobufJS definitions with the plugin's
            addProtobufDefinitions method.
          </Text>
        );
      }

      if (request.responseData) {
        const data = protobufDefinition.decode(
          bodyAsBinary(request.responseData)!,
        );
        return <JSONText>{data.toJSON()}</JSONText>;
      } else {
        return (
          <Text>Could not locate response body data for {request.url}</Text>
        );
      }
    }
    return undefined;
  }
}

const BodyFormatters: Array<BodyFormatter> = [
  new ImageFormatter(),
  new VideoFormatter(),
  new LogEventFormatter(),
  new GraphQLBatchFormatter(),
  new GraphQLFormatter(),
  new JSONFormatter(),
  new FormUrlencodedFormatter(),
  new XMLTextFormatter(),
  new ProtobufFormatter(),
  new BinaryFormatter(),
];

const TextBodyFormatters: Array<BodyFormatter> = [new JSONTextFormatter()];

class InsightsInspector extends Component<{insights: Insights}> {
  formatTime(value: number): string {
    return `${value} ms`;
  }

  formatSpeed(value: number): string {
    return `${formatBytes(value)}/sec`;
  }

  formatRetries = (retry: RetryInsights): string => {
    const timesWord = retry.limit === 1 ? 'time' : 'times';

    return `${this.formatTime(retry.timeSpent)} (${
      retry.count
    } ${timesWord} out of ${retry.limit})`;
  };

  buildRow<T>(
    name: string,
    value: T | null | undefined,
    formatter: (value: T) => string,
  ): any {
    return value
      ? {
          key: name,
          value: formatter(value),
        }
      : null;
  }

  render() {
    const insights = this.props.insights;
    const {buildRow, formatTime, formatSpeed, formatRetries} = this;

    const rows = [
      buildRow('Retries', insights.retries, formatRetries),
      buildRow('DNS lookup time', insights.dnsLookupTime, formatTime),
      buildRow('Connect time', insights.connectTime, formatTime),
      buildRow('SSL handshake time', insights.sslHandshakeTime, formatTime),
      buildRow('Pretransfer time', insights.preTransferTime, formatTime),
      buildRow('Redirect time', insights.redirectsTime, formatTime),
      buildRow('First byte wait time', insights.timeToFirstByte, formatTime),
      buildRow('Data transfer time', insights.transferTime, formatTime),
      buildRow('Post processing time', insights.postProcessingTime, formatTime),
      buildRow('Bytes transfered', insights.bytesTransfered, formatBytes),
      buildRow('Transfer speed', insights.transferSpeed, formatSpeed),
    ].filter((r) => r != null);

    return rows.length > 0 ? <KeyValueTable items={rows} /> : null;
  }
}
