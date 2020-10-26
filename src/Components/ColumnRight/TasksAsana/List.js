import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import TaskTrackerStore from '../../../Stores/TaskTrackerStore';
import {merge} from 'lodash';

import {Box, CircularProgress, Fab, Grow, Link, List, ListItem, ListItemIcon, ListItemText, Typography} from '@material-ui/core';
import CheckedIcon from '@material-ui/icons/RadioButtonChecked';
import UncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import { Add as AddIcon } from '@material-ui/icons';
import { useTranslation } from 'react-i18next';
import './List.css';
import TaskCard from './TaskCard';
import { asanaHeaders } from '../../../Utils/Api';

export default function TasksList ({ chatId, onNewTaskToggle }) {
  const [{ chats, getSectionsWithTasks }] = useState(TaskTrackerStore);
  const projectId = chats && chatId && chats[chatId] && chats[chatId].tasksStore.projectId
  const [sectionsState, setSectionsState] = useState(() => getCache())
  const [status, setStatus] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const [currentTaskId, setCurrentTaskId] = useState(null)
  const currentTask = useMemo(() => currentTaskId && sectionsState[projectId] && sectionsState[projectId].all && sectionsState[projectId].all.tasks[currentTaskId], [currentTaskId, sectionsState, projectId])
  const {t} = useTranslation();

  useEffect(() => {
    if (!projectId) return
    setStatus('loading')

    getSectionsWithTasks(projectId)
      .then(({sections, all: {tasks}}) => {
        setStatus(null);
        const sectionsState_ = {...sectionsState, [projectId]: {sections, all: { tasks }}};
        setSectionsState(sectionsState_);
        sessionStorage[`Tasktracker_sectionsState`] = JSON.stringify(sectionsState_)
      })
      .catch(setStatus)
  }, [projectId, refreshToken])

  useEffect(() => void TaskTrackerStore.on('taskCreated', () => setRefreshToken(Date.now())), [])

  return <div className="chat-tasks-list">
      <div className={classNames('chat', 'chat-tasks-list-wrap', { 'chat-big': true, 'chat-tasks-list-wrap__short': currentTask })}>
          <div className='chat-wrapper'>
              <div className='chat-details-items-wrap'>
                {status === 'loading' && <CircularProgress style={{ right: 30, position: 'absolute' }} size={24} /> }
                {sectionsState[projectId] && sectionsState[projectId].sections
                  ? sectionsState[projectId].sections.map((section) => {
                    const tasks = section.tasks.map(id => sectionsState[projectId].all.tasks[id]).filter(Boolean)
                    const closedTasks = tasks.filter(t => t.completed)
                    return <section key={section.id || section.name}>
                      { section.name && section.name !== '(no section)' && (
                        <Typography variant='h6' style={{ marginLeft: 16, color: 'grey', marginTop: 16 }}>{ section.name.toLowerCase() }</Typography>
                      )}
                      {renderItems(tasks.filter(t => !t.completed))}
                      {Boolean(closedTasks.length) && <details style={{ marginBottom: 16 }}>
                        <summary style={{ color: 'silver' }}>{closedTasks.length} {t('closed tasks')}</summary>
                        {renderItems(closedTasks)}
                      </details>}
                    </section>
                  })
                  : <Box p={2}><i style={{ color: status instanceof Error ? 'darkred' : 'grey' }}>
                    {status === 'loading'
                      ? 'Just a sec'
                      : status instanceof Error
                      ? 'I tried, but I cannot show anything :('
                      : 'No tasks yet, let`s get started!'
                    }</i></Box>
                }
              </div>

              <Fab className="chat-tasks-add" aria-label="add" color="primary"
                onClick={onNewTaskToggle}
              >
                <AddIcon/>
              </Fab>
          </div>
      </div>

      {/* Grow does not work */}
      { currentTask
        ? <TaskCard data={ currentTask } onClose={ () => setCurrentTaskId(null) } onSendChange={sendChange} onCompleteToggle={ () => handleTaskCompleteToggle(currentTask.id) } />
        : <div style={{ flexGrow: 1 }}/>
      }
  </div>

  function renderItems(tasks) {
    return <List className='chat-details-items' style={{ paddingTop: 0 }}>
      { tasks.map(({id,name,permalink_url,completed}) => (
          <ListItem key={id} divider className='list-item-compact' alignItems='flex-start'>
              <ListItemIcon style={{ cursor: 'pointer'}} onClick={ () => handleTaskCompleteToggle(id) }>{completed ? <CheckedIcon color="disabled"/> : <UncheckedIcon color="disabled"/> }</ListItemIcon>
              <ListItemText
                onClick={ (e) => handleItemClick(e, id) }
                primary={<>{name}</>}
                style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', cursor: 'pointer'}}
              />
          </ListItem>
      ))}
    </List>
  }

  function handleItemClick (e, id) {
    if (e.metaKey || e.ctrlKey) return
    e.preventDefault()
    e.stopPropagation()
    setCurrentTaskId(id);
  }

  function handleTaskCompleteToggle (id) {
    const next = !sectionsState[projectId].all.tasks[id].completed
    sendChange(id, 'completed', next)
    setSectionsState(state => merge({}, state, {[projectId]: { all: { tasks: { [id]: { completed: next }}}}}))
  }
}

function sendChange (id, field, value) {
  const body = JSON.stringify({ data: { [field]: value } });
  fetch(`https://app.asana.com/api/1.0/tasks/${ id }`, { headers: asanaHeaders, method: 'PUT', body })
}

function getCache() {
  return sessionStorage[`Tasktracker_sectionsState`] && JSON.parse(sessionStorage[`Tasktracker_sectionsState`]) || {}
}
