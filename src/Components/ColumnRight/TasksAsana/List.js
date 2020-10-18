import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import TaskTrackerStore from '../../../Stores/TaskTrackerStore';

import {CircularProgress, Fab, Link, List, ListItem, ListItemIcon, ListItemText} from '@material-ui/core';
import CheckedIcon from '@material-ui/icons/RadioButtonChecked';
import UncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import { Add } from '@material-ui/icons';

export default function TasksList ({ chatId, onNewTaskToggle }) {
  const [{ chats, getFullTasks }] = useState(TaskTrackerStore);
  const projectId = chats && chatId && chats[chatId] && chats[chatId].tasksStore.projectId
  const [tasks, setTasks] = useState(() => sessionStorage[`taskTrackerTasks_${projectId}`] && JSON.parse(sessionStorage[`taskTrackerTasks_${projectId}`]) || [])
  const [status, setStatus] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)

  useEffect(() => {
    setStatus('loading')
    getFullTasks(projectId).then(tasks => (setTasks(tasks), setStatus(null), sessionStorage[`taskTrackerTasks_${projectId}`] = JSON.stringify(tasks)), setStatus)
  }, [projectId, refreshToken])

  useEffect(() => void TaskTrackerStore.on('taskCreated', () => setRefreshToken(Date.now())), [])

  return <div className="chat-tasks-list" style={{ overflowY: 'auto' }}>
      <div className={classNames('chat', { 'chat-big': true })}>
          <div className='chat-wrapper'>
              <List className='chat-details-items'>
                {status === 'loading' && <CircularProgress style={{ right: 30, position: 'absolute' }} size={24} /> }
                {tasks.map(({id,name,permalink_url,completed}) => (
                    <ListItem key={id} divider className='list-item-compact' alignItems='flex-start'>
                        <ListItemIcon>{completed ? <CheckedIcon color="disabled"/> : <UncheckedIcon color="disabled"/> }</ListItemIcon>
                        <ListItemText
                          primary={<Link color="inherit" underline="none" href={ permalink_url } target="_blank" rel="noopener noreferrer">{name}</Link>}
                          style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                        />
                    </ListItem>
                ))}
              </List>

              <Fab className="chat-tasks-add" aria-label="add" color="primary"
                  onClick={onNewTaskToggle}
              >
                  <Add/>
              </Fab>
          </div>
      </div>
  </div>
}
