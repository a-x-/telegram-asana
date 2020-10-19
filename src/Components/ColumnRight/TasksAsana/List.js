import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import TaskTrackerStore from '../../../Stores/TaskTrackerStore';

import {Box, CircularProgress, Fab, Link, List, ListItem, ListItemIcon, ListItemText, Typography} from '@material-ui/core';
import CheckedIcon from '@material-ui/icons/RadioButtonChecked';
import UncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import { Add } from '@material-ui/icons';
import { useTranslation } from 'react-i18next';

export default function TasksList ({ chatId, onNewTaskToggle }) {
  const [{ chats, getSectionsWithTasks }] = useState(TaskTrackerStore);
  const projectId = chats && chatId && chats[chatId] && chats[chatId].tasksStore.projectId
  const [sections, setSections] = useState(() => sessionStorage[`taskTracker_sections_${projectId}`] && JSON.parse(sessionStorage[`taskTracker_sections_${projectId}`]) || null)
  const [status, setStatus] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const {t} = useTranslation();

  useEffect(() => {
    setStatus('loading')
    getSectionsWithTasks(projectId).then(items => (setSections(items), setStatus(null), sessionStorage[`taskTracker_sections_${projectId}`] = JSON.stringify(items)), setStatus)
  }, [projectId, refreshToken])

  useEffect(() => void TaskTrackerStore.on('taskCreated', () => setRefreshToken(Date.now())), [])

  return <div className="chat-tasks-list" style={{ overflowY: 'auto' }}>
      <div className={classNames('chat', { 'chat-big': true })}>
          <div className='chat-wrapper'>
              <div className='chat-details-items'>
                {status === 'loading' && <CircularProgress style={{ right: 30, position: 'absolute' }} size={24} /> }
                {sections
                  ? sections.map((section) => {
                    const closedTasks = section.tasks.filter(t => t.completed)
                    return <>
                      { section.name && section.name !== '(no section)' && (
                        <Typography variant='h6' style={{ marginLeft: 16, color: 'grey', marginTop: 16 }}>{ section.name.toLowerCase() }</Typography>
                      )}
                      {renderItems(section.tasks.filter(t => !t.completed))}
                      {Boolean(closedTasks.length) && <details style={{ marginBottom: 16 }}>
                        <summary style={{ color: 'silver' }}>{closedTasks.length} {t('closed tasks')}</summary>
                        {renderItems(closedTasks)}
                      </details>}
                    </>
                  })
                  : <Box p={2}><i style={{ color: 'grey' }}>Just a sec</i></Box>
                }
              </div>

              <Fab className="chat-tasks-add" aria-label="add" color="primary"
                  onClick={onNewTaskToggle}
              >
                  <Add/>
              </Fab>
          </div>
      </div>
  </div>

  function renderItems(tasks) {
    return <List className='chat-details-items' style={{ paddingTop: 0 }}>
      { tasks.map(({id,name,permalink_url,completed}) => (
          <ListItem key={id} divider className='list-item-compact' alignItems='flex-start'>
              <ListItemIcon>{completed ? <CheckedIcon color="disabled"/> : <UncheckedIcon color="disabled"/> }</ListItemIcon>
              <ListItemText
                primary={<Link color="inherit" underline="none" href={ permalink_url } target="_blank" rel="noopener noreferrer">{name}</Link>}
                style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
              />
          </ListItem>
      ))}
    </List>
  }
}
