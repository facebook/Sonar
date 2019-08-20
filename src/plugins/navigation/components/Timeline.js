/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {colors, FlexCenter, styled} from 'flipper';
import {NavigationInfoBox} from './';

import type {Bookmark, NavigationEvent} from '../flow-types';

type Props = {|
  bookmarks: Map<string, Bookmark>,
  events: Array<NavigationEvent>,
  onNavigate: string => void,
  onFavorite: string => void,
|};

const TimelineContainer = styled('div')({
  overflowY: 'scroll',
  flexGrow: 1,
});

const NoData = styled(FlexCenter)({
  height: '100%',
  fontSize: 18,
  backgroundColor: colors.macOSTitleBarBackgroundBlur,
  color: colors.macOSTitleBarIcon,
});

export default (props: Props) => {
  const {bookmarks, events, onNavigate, onFavorite} = props;
  return events.length === 0 ? (
    <NoData>No Navigation Events to Show</NoData>
  ) : (
    <TimelineContainer>
      {events.map((event: NavigationEvent, idx) => {
        return (
          <NavigationInfoBox
            key={idx}
            isBookmarked={event.uri != null ? bookmarks.has(event.uri) : false}
            uri={event.uri}
            onNavigate={onNavigate}
            onFavorite={onFavorite}
          />
        );
      })}
    </TimelineContainer>
  );
};
