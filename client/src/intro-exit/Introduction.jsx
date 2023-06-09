import React, { useState } from "react"; // new
import { Button } from "../components/Button";
import { usePlayer } from "@empirica/core/player/classic/react"; // new

export function Introduction({ next }) {
  const [groupCode, setGroupCode] = useState(""); // new
  const player = usePlayer(); // new

  function handleGroupCodeChange(event) {
    // new
    setGroupCode(event.target.value);
  }

  function onSubmit() {
    player.set("groupCode", groupCode); // new
    next();
  }

  return (
    <div className="mt-3 sm:mt-5 p-20">
      <h3 className="text-lg leading-6 font-medium text-gray-900">
        Instruction One
      </h3>
      <div className="mt-2 mb-6">
        <p className="text-sm text-gray-500">
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Eius aliquam
          laudantium explicabo pariatur iste dolorem animi vitae error totam. At
          sapiente aliquam accusamus facere veritatis.
        </p>
      </div>
      <div className="mt-5">
        <p>Please enter your group code</p>
        <input
          type="text"
          className="border border-gray-300 rounded-md w-full px-3 py-2 mt-1"
          onChange={handleGroupCodeChange}
        />
      </div>
      <Button handleClick={onSubmit} autoFocus>
        <p>Next</p>
      </Button>
    </div>
  );
}
