const getFormattedDate =() =>{
  const dateObj = new Date()
  const formattedDate = dateObj.toISOString().slice(0, 10)
  return formattedDate;
}

const  manipulateDate = (strDate, days)=> {
  const dateObj = new Date(strDate); // Convert string to Date object
  dateObj.setDate(dateObj.getDate() + days); // Add/subtract days
  const formattedDate = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD format
  return formattedDate; 
}


export {getFormattedDate ,manipulateDate}