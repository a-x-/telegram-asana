import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {Fab, List, ListItem, ListItemText} from '@material-ui/core';
import { Add } from '@material-ui/icons';

const fake = ['Отчёты', 'Баннеры', 'Техническиое', 'Юридическое'].map(title => ({id:title,title}))

export default function TasksList ({ onNewTaskToggle }) {
  const [tasks, setTasks] = useState(fake)
  return <div className="chat-tasks-list">
      <div className={classNames('chat', { 'chat-big': true })}>
          <div className='chat-wrapper'>
              <List className='chat-details-items'>
                      {tasks.map(({id,title}) => (
                          <ListItem key={id} divider className='list-item-rounded' alignItems='flex-start'>
                              <ListItemText primary={title} style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }} />
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
