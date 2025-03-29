const { app } = require("../../../server");


//get all goats
router.get("/get-all-goats", (req, res) => {
    res.send("get all goats");
    // db.any('SELECT * FROM goat')
    //     .then(data => {
    //         res.status(200).json({ message: "success", data: data });
    //         console.log(data);
    //     })
    //     .catch(error => {
    //         res.status(500).json({ message: "internal server error", error: error });
    //         console.error(error);
    //     });

});

