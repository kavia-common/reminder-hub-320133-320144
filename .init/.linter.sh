#!/bin/bash
cd /home/kavia/workspace/code-generation/reminder-hub-320133-320144/reminders_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

