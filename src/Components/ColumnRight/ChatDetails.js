/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { compose } from '../../Utils/HOC';
import { withSnackbar } from 'notistack';
import { withTranslation } from 'react-i18next';
import AlternateEmailIcon from '@material-ui/icons/AlternateEmail';
import CallIcon from '@material-ui/icons/Call';
import CloseIcon from '../../Assets/Icons/Close';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import IconButton from '@material-ui/core/IconButton';
import {duration, Typography, List, ListItem, ListItemIcon, ListItemText} from '@material-ui/core';
import User from '../Tile/User';
import Chat from '../Tile/Chat';
import ChatDetailsHeader from './ChatDetailsHeader';
import NotificationsListItem from './NotificationsListItem';
import SharedMediaTabs from './SharedMedia/SharedMediaTabs';
import SharedMediaContent from './SharedMedia/SharedMediaContent';
import { copy } from '../../Utils/Text';
import { getFormattedText, getUrlMentionHashtagEntities } from '../../Utils/Message';
import {
    getChatUsername,
    getChatPhoneNumber,
    getChatBio,
    isGroupChat,
    getGroupChatMembers,
    getChatFullInfo,
    isPrivateChat,
    isMeChat, isChannelChat
} from '../../Utils/Chat';
import { getUserStatusOrder } from '../../Utils/User';
import { loadUsersContent, loadChatsContent } from '../../Utils/File';
import { formatPhoneNumber } from '../../Utils/Phone';
import { openChat, openUser, setProfileMediaViewerContent } from '../../Actions/Client';
import { withRestoreRef, withSaveRef } from '../../Utils/HOC';
import { NOTIFICATION_AUTO_HIDE_DURATION_MS, SCROLL_PRECISION } from '../../Constants';
import BasicGroupStore from '../../Stores/BasicGroupStore';
import ChatStore from '../../Stores/ChatStore';
import FileStore from '../../Stores/FileStore';
import OptionStore from '../../Stores/OptionStore';
import SupergroupStore from '../../Stores/SupergroupStore';
import UserStore from '../../Stores/UserStore';
import TasksStore from '../../Stores/TaskTrackerStore';
import TdLibController from '../../Controllers/TdLibController';
import './MoreListItem.css';
import './ChatDetails.css';
import { CSSTransition } from 'react-transition-group';
import TasksList from './TasksAsana/List';
import NewTask from './TasksAsana/NewTask';
import { isToday } from 'date-fns';

class ChatDetails extends React.Component {
    constructor(props) {
        super(props);

        this.listRef = React.createRef();
        this.dividerRef = React.createRef();
        this.mediaRef = React.createRef();

        const { chatId } = this.props;
        const tasksStore = this.getTasksStore()
        const projectId = tasksStore && tasksStore.projectId

        this.members = new Map();
        this.state = {
            prevChatId: chatId,
            headerTab: tasksStore ? 'tasks' : 'info',
            newTaskFormOpen: checkShouldTaskFormOpen(projectId),
        };
    }

    static getDerivedStateFromProps(props, state) {
        if (props.chatId !== state.prevChatId) {
            return {
                prevChatId: props.chatId
            };
        }

        return null;
    }

    getSnapshotBeforeUpdate(prevProps, prevState) {
        const { chatId } = this.props;

        const { current: list } = this.listRef;

        if (!list) return {}

        const { scrollTop, scrollHeight, offsetHeight } = list;
        const snapshot = {
            scrollTop,
            scrollHeight,
            offsetHeight
        };

        // console.log(
        //     `[ChatDetails] getSnapshotBeforeUpdate chatId=${chatId} scrollTop=${scrollTop} scrollHeight=${scrollHeight} offsetHeight=${offsetHeight}`
        // );

        return snapshot;
    }

    // shouldComponentUpdate(nextProps, nextState) {
    //     const { chatId, theme, counters, migratedCounters } = this.props;

    //     if (nextProps.chatId !== chatId) return true;
    //     if (nextProps.counters !== counters) return true;
    //     if (nextProps.migratedCounters !== migratedCounters) return true;
    //     if (nextProps.theme !== theme) return true;
    //     if (nextState.headerTab !== this.state.headerTab) return true
    //     if (nextState.newTaskFormOpen !== this.state.newTaskFormOpen) return true

    //     return false;
    // }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const { chatId } = this.props;
        if (prevProps.chatId !== chatId) this.loadContent();

        const { current: list } = this.listRef;
        const { scrollTop, scrollHeight, offsetHeight } = snapshot;
        if (list) list.scrollTop = prevProps.chatId === chatId ? scrollTop : 0;

        if (prevProps.chatId !== this.props.chatId) {
            const tasksStore = this.getTasksStore()
            const projectId = tasksStore && tasksStore.projectId
            this.setState({
                headerTab: tasksStore ? 'tasks' : 'info',
                newTaskFormOpen: checkShouldTaskFormOpen(projectId),
            });
        }
    }

    componentDidMount() {
        this.loadContent();

        UserStore.on('updateUserStatus', this.onUpdateUserStatus);
        UserStore.on('updateUserFullInfo', this.onUpdateUserFullInfo);
        BasicGroupStore.on('updateBasicGroupFullInfo', this.onUpdateBasicGroupFullInfo);
        SupergroupStore.on('updateSupergroupFullInfo', this.onUpdateSupergroupFullInfo);
    }

    componentWillUnmount() {
        UserStore.off('updateUserStatus', this.onUpdateUserStatus);
        UserStore.off('updateUserFullInfo', this.onUpdateUserFullInfo);
        BasicGroupStore.off('updateBasicGroupFullInfo', this.onUpdateBasicGroupFullInfo);
        SupergroupStore.off('updateSupergroupFullInfo', this.onUpdateSupergroupFullInfo);
    }

    onUpdateBasicGroupFullInfo = update => {
        const chat = ChatStore.get(this.props.chatId);
        if (!chat) return;

        if (
            chat.type &&
            chat.type['@type'] === 'chatTypeBasicGroup' &&
            chat.type.basic_group_id === update.basic_group_id
        ) {
            this.forceUpdate(); // update bio
        }
    };

    onUpdateSupergroupFullInfo = update => {
        const chat = ChatStore.get(this.props.chatId);
        if (!chat) return;

        if (
            chat.type &&
            chat.type['@type'] === 'chatTypeSupergroup' &&
            chat.type.supergroup_id === update.supergroup_id
        ) {
            this.forceUpdate(); // update bio
        }
    };

    onUpdateUserFullInfo = update => {
        const chat = ChatStore.get(this.props.chatId);
        if (!chat) return;

        if (
            chat.type &&
            (chat.type['@type'] === 'chatTypePrivate' || chat.type['@type'] === 'chatTypeSecret') &&
            chat.type.user_id === update.user_id
        ) {
            this.forceUpdate(); // update bio
        }
    };

    onUpdateUserStatus = update => {
        if (this.members.has(update.user_id)) {
            this.forceUpdate();
        }
    };

    loadContent = () => {
        this.loadChatContents();
    };

    loadChatContents = () => {
        const { chatId, popup } = this.props;

        const store = FileStore.getStore();

        loadChatsContent(store, [chatId]);
        const members = getGroupChatMembers(chatId).map(x => x.user_id);
        loadUsersContent(store, members);

        if (popup) {
            getChatFullInfo(chatId);
        }
    };

    handleUsernameHint = () => {
        const { t, chatId } = this.props;
        const username = getChatUsername(chatId);
        if (!username) return;

        const telegramUrlOption = OptionStore.get('t_me_url');
        const usernameLink = telegramUrlOption ? telegramUrlOption.value : 'https://telegram.org/';

        copy(usernameLink + username);

        this.handleScheduledAction(t('LinkCopied'));
    };

    handleScheduledAction = message => {
        const { enqueueSnackbar, closeSnackbar } = this.props;

        const snackKey = enqueueSnackbar(message, {
            autoHideDuration: NOTIFICATION_AUTO_HIDE_DURATION_MS,
            preventDuplicate: true,
            action: [
                <IconButton
                    key='close'
                    aria-label='Close'
                    color='inherit'
                    className='notification-close-button'
                    onClick={() => {
                        closeSnackbar(snackKey);
                    }}>
                    <CloseIcon />
                </IconButton>
            ]
        });
    };

    handlePhoneHint = () => {
        const { t, chatId } = this.props;
        const phoneNumber = getChatPhoneNumber(chatId);
        if (!phoneNumber) return;

        copy(formatPhoneNumber(phoneNumber));

        this.handleScheduledAction(t('PhoneCopied'));
    };

    handleHeaderClick = () => {
        if (!this.listRef.current) return;
        this.listRef.current.scrollTop = 0;
    };

    handleOpenViewer = () => {
        const { chatId, popup } = this.props;
        const chat = ChatStore.get(chatId);
        if (!chat) return;
        if (!chat.photo) return;

        setProfileMediaViewerContent({ chatId });

        if (popup) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateDialogChatId',
                chatId: 0
            });
        }
    };

    handleOpenChat = () => {
        const { chatId, popup } = this.props;

        openChat(chatId, null, false);

        if (popup) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateDialogChatId',
                chatId: 0
            });
        }
    };

    handleOpenUser = userId => {
        openUser(userId, true);
    };

    getContentHeight = () => {
        if (!this.listRef.current) return 0;

        return this.listRef.current.clientHeight;
    };

    getTasksStore () {
        const { chatId } = this.props;
        return chatId && TasksStore.chats && TasksStore.chats[chatId] && TasksStore.chats[chatId].tasksStore
    }

    handleTabClick = event => {
        const { current: list } = this.listRef;
        if (!list) return;

        const { current: divider } = this.dividerRef;
        if (!divider) return;
        if (divider.offsetTop === list.scrollTop) return;

        if (list.scrollTop < divider.offsetTop) {
            list.scrollTo({
                top: divider.offsetTop,
                behavior: 'smooth'
            });
        } else {
            list.scrollTop = divider.offsetTop + 70;
            setTimeout(() => {
                list.scrollTo({
                    top: divider.offsetTop,
                    behavior: 'smooth'
                });
            }, 0);
        }
        // requestAnimationFrame(() => {
        //     list.scrollTo({
        //         top: divider.offsetTop,
        //         behavior: 'smooth'
        //     });
        // });
    };

    handleScroll = event => {
        if (!this.listRef.current) return;
        if (!this.mediaRef) return;

        const { current: list } = this.listRef;
        if (!list) return;

        const { current: media } = this.mediaRef;
        if (!media) return;

        if (list.scrollTop + list.offsetHeight >= list.scrollHeight - SCROLL_PRECISION) {
            media.handleScroll(event);
        }

        media.handleVirtScroll(event, list);
    };

    render() {
        const {
            backButton,
            className,
            chatId,
            onClose,
            onOpenGroupInCommon,
            onOpenSharedAudios,
            onOpenSharedDocuments,
            onOpenSharedLinks,
            onOpenSharedMedia,
            onOpenSharedPhotos,
            onOpenSharedVideos,
            onOpenSharedVoiceNotes,
            popup,
            t
        } = this.props;

        let { counters, migratedCounters } = this.props;
        counters = counters || [0, 0, 0, 0, 0, 0];
        migratedCounters = migratedCounters || [0, 0, 0, 0, 0, 0];

        const [photoCount, videoCount, documentCount, audioCount, urlCount, voiceAndVideoNoteCount] = counters.map(
            (el, i) => el + migratedCounters[i]
        );

        const chat = ChatStore.get(chatId);
        if (!chat) {
            return (
                <div className='chat-details'>
                    <ChatDetailsHeader onClose={onClose} tab={this.state.headerTab} onTabChange={(tab) => this.setState({ headerTab: tab })}/>
                    <div ref={this.listRef} className={classNames('chat-details-list', 'scrollbars-hidden')} />
                </div>
            );
        }

        let groupInCommonCount = 0;
        if (isPrivateChat(chatId)) {
            const fullInfo = UserStore.getFullInfo(chat.type.user_id);
            groupInCommonCount = fullInfo ? fullInfo.group_in_common_count : groupInCommonCount;
        }

        const username = getChatUsername(chatId);
        const phoneNumber = getChatPhoneNumber(chatId);
        let bio = getChatBio(chatId);
        const isGroup = isGroupChat(chatId);
        const isMe = isMeChat(chatId);

        const members = getGroupChatMembers(chatId);
        const users = [];
        this.members = new Map();
        members.forEach(member => {
            const user = UserStore.get(member.user_id);
            if (user) {
                this.members.set(user.id, user.id);
                users.push(user);
            }
        });

        const sortedUsers = users.sort((x, y) => {
            return getUserStatusOrder(y) - getUserStatusOrder(x);
        });
        const items = sortedUsers.map(user => (
            <ListItem button className='list-item' key={user.id}>
                <User userId={user.id} onSelect={this.handleOpenUser} />
            </ListItem>
        ));

        const { photo } = chat;

        if (isGroupChat(chatId) || isChannelChat(chatId)) {
            const { text: bioText, entities: bioEntities } = getUrlMentionHashtagEntities(bio, []);
            if (bioEntities.length > 0) {
                bio = getFormattedText({ '@type': 'formattedText', text: bioText, entities: bioEntities });
            }
        }

        const content = this.renderContent(chatId, backButton, onClose, popup, photo, isMe, bio, t, username, phoneNumber, isGroup);

        return popup ? <>{content}</> : <div className={classNames('chat-details', className)}>{content}</div>;
    }

    renderContent(chatId, backButton, onClose, popup, photo, isMe, bio, t, username, phoneNumber, isGroup) {
        return (
            <>
                <CSSTransition
                    timeout={{ enter: duration.enteringScreen, exit: duration.leavingScreen }}
                    in={this.state.newTaskFormOpen}
                    mountOnEnter={true}
                    unmountOnExit={true}>
                        <div>
                            {this.state.newTaskFormOpen && <NewTask chatId={ chatId } onClose={()=>this.setState({newTaskFormOpen: false})} /> }
                        </div>
                </CSSTransition>

                <ChatDetailsHeader
                    chatId={chatId}
                    backButton={backButton}
                    onClose={onClose}
                    onBackClick={this.handleHeaderClick}
                    tab={this.state.headerTab} onTabChange={(tab) => this.setState({ headerTab: tab })} />
                {this.state.headerTab === 'info' && this.renderInfo(chatId, popup, photo, isMe, bio, t, username, phoneNumber, isGroup)}
                {this.state.headerTab === 'tasks' && <TasksList chatId={chatId} onNewTaskToggle={() => this.setState(({newTaskFormOpen}) => ({ newTaskFormOpen: !newTaskFormOpen}))} />}
            </>
        );
    }

    renderInfo(chatId, popup, photo, isMe, bio, t, username, phoneNumber, isGroup) {
        return <div
            ref={this.listRef}
            className={classNames('chat-details-list', 'scrollbars-hidden')}
            onScroll={this.handleScroll}>
            <div className='chat-details-info'>
                <Chat
                    chatId={chatId}
                    big={true}
                    showStatus={true}
                    showSavedMessages={!popup}
                    onTileSelect={photo ? this.handleOpenViewer : null} />
                {!isMe && (
                    <List className='chat-details-items'>
                        {bio && (
                            <ListItem className='list-item-rounded' alignItems='flex-start'>
                                <ListItemIcon>
                                    <ErrorOutlineIcon className='chat-details-info-icon' />
                                </ListItemIcon>
                                <ListItemText
                                    primary={bio}
                                    secondary={t('Bio')}
                                    style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }} />
                            </ListItem>
                        )}
                        {username && (
                            <ListItem button className='list-item-rounded' alignItems='flex-start' onClick={this.handleUsernameHint}>
                                <ListItemIcon>
                                    <AlternateEmailIcon />
                                </ListItemIcon>
                                <ListItemText
                                    primary={<Typography variant='inherit' noWrap>
                                        {username}
                                    </Typography>}
                                    secondary={t('Username')} />
                            </ListItem>
                        )}
                        {phoneNumber && (
                            <>
                                <ListItem button className='list-item-rounded' alignItems='flex-start' onClick={this.handlePhoneHint}>
                                    <ListItemIcon>
                                        <CallIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={<Typography variant='inherit' noWrap>
                                            {formatPhoneNumber(phoneNumber)}
                                        </Typography>}
                                        secondary={t('Phone')} />
                                </ListItem>
                            </>
                        )}
                        <NotificationsListItem chatId={chatId} />
                        {popup && !isGroup && (
                            <ListItem button className='list-item-rounded' alignItems='flex-start' onClick={this.handleOpenChat}>
                                <ListItemText
                                    primary={<Typography color='primary' variant='inherit' noWrap>
                                        {t('SendMessage').toUpperCase()}
                                    </Typography>}
                                    style={{ paddingLeft: 40 }} />
                            </ListItem>
                        )}
                    </List>
                )}
            </div>

            <div ref={this.dividerRef} />
            <SharedMediaTabs chatId={chatId} onClick={this.handleTabClick} />
            <SharedMediaContent ref={this.mediaRef} chatId={chatId} />
        </div>;
    }
}

ChatDetails.propTypes = {
    chatId: PropTypes.number,
    popup: PropTypes.bool,
    onClose: PropTypes.func,
    onOpenGroupInCommon: PropTypes.func,
    onOpenSharedDocuments: PropTypes.func,
    onOpenSharedMedia: PropTypes.func,
    onOpenSharedLinks: PropTypes.func,
    onOpenSharedPhotos: PropTypes.func,
    onOpenSharedVideos: PropTypes.func,
    onOpenSharedVoiceNotes: PropTypes.func
};

const enhance = compose(
    withSaveRef(),
    withTranslation(),
    withSnackbar,
    withRestoreRef()
);

function checkShouldTaskFormOpen(projectId) {
    const json = localStorage[`taskTrackerIncomplete_${projectId}`]
    if (!json) return
    return Object.entries(JSON.parse(json))
        .filter(([key, value]) => key !== 'parent' && (key === 'due_on' ? !isToday(value) : true))
        .map(([_, value]) => value)
        .some(Boolean)
}

export default enhance(ChatDetails);
