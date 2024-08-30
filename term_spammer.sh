#!/bin/bash

# The message to be sent
MESSAGE="TROLL!!!"

# The recipient or location to send the message to (adjust this part according to your needs)
RECIPIENT="jiri.novak"

# Loop to send the message every second
while true
do
    echo "$MESSAGE" | write $RECIPIENT
done
